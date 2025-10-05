from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
import uuid
import aiofiles
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(title="HRMS API", description="Leave & Expense Management System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/hrms_db')
client = MongoClient(MONGO_URL)
db = client.hrms_db

# Collections
users_collection = db.users
departments_collection = db.departments
leave_types_collection = db.leave_types
leave_requests_collection = db.leave_requests
expense_categories_collection = db.expense_categories
expense_requests_collection = db.expense_requests
attendance_collection = db.attendance
holidays_collection = db.holidays

# Security  
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
security = HTTPBearer()
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-here')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '30'))

# Upload directory
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', './uploads'))
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    employee_id: str
    department_id: str
    role: str = "employee"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LeaveTypeCreate(BaseModel):
    name: str
    description: str
    max_days_per_year: int
    carry_forward_days: int = 0
    is_paid: bool = True
    requires_approval: bool = True

class LeaveRequest(BaseModel):
    leave_type_id: str
    start_date: str
    end_date: str
    duration_type: str  # "full_day", "half_day", "work_from_home"
    reason: str
    manager_id: Optional[str] = None

class ExpenseRequest(BaseModel):
    category_id: str
    amount: float
    expense_date: str
    description: str
    manager_id: Optional[str] = None

class AttendanceLog(BaseModel):
    action: str  # "check_in" or "check_out"
    location: Optional[str] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    # Truncate password to 72 characters for bcrypt compatibility
    if len(plain_password) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # Truncate password to 72 characters for bcrypt compatibility
    if len(password) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = users_collection.find_one({"user_id": user_id})
    if user is None:
        raise credentials_exception
    return user

# Initialize default data
@app.on_event("startup")
async def startup_event():
    # Create default admin user if not exists
    if not users_collection.find_one({"email": "admin@company.com"}):
        admin_user = {
            "user_id": str(uuid.uuid4()),
            "email": "admin@company.com",
            "password_hash": get_password_hash("admin123"),
            "full_name": "System Administrator",
            "employee_id": "EMP001",
            "role": "admin",
            "department_id": "dept_001",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "leave_balances": {}
        }
        users_collection.insert_one(admin_user)
    
    # Create default department
    if not departments_collection.find_one({"dept_id": "dept_001"}):
        default_dept = {
            "dept_id": "dept_001",
            "name": "Administration",
            "description": "Administrative Department",
            "manager_id": None,
            "created_at": datetime.utcnow()
        }
        departments_collection.insert_one(default_dept)
    
    # Create default leave types
    default_leave_types = [
        {
            "type_id": str(uuid.uuid4()),
            "name": "Casual Leave",
            "description": "Casual leave for personal work",
            "max_days_per_year": 12,
            "carry_forward_days": 5,
            "is_paid": True,
            "requires_approval": True,
            "supports_half_day": True,
            "supports_wfh": False,
            "created_at": datetime.utcnow()
        },
        {
            "type_id": str(uuid.uuid4()),
            "name": "Sick Leave",
            "description": "Medical leave",
            "max_days_per_year": 10,
            "carry_forward_days": 0,
            "is_paid": True,
            "requires_approval": True,
            "supports_half_day": True,
            "supports_wfh": False,
            "created_at": datetime.utcnow()
        },
        {
            "type_id": str(uuid.uuid4()),
            "name": "Work From Home",
            "description": "Remote work arrangement",
            "max_days_per_year": 50,
            "carry_forward_days": 0,
            "is_paid": True,
            "requires_approval": True,
            "supports_half_day": False,
            "supports_wfh": True,
            "created_at": datetime.utcnow()
        },
        {
            "type_id": str(uuid.uuid4()),
            "name": "Annual Leave",
            "description": "Yearly vacation leave",
            "max_days_per_year": 21,
            "carry_forward_days": 10,
            "is_paid": True,
            "requires_approval": True,
            "supports_half_day": True,
            "supports_wfh": False,
            "created_at": datetime.utcnow()
        }
    ]
    
    for leave_type in default_leave_types:
        if not leave_types_collection.find_one({"name": leave_type["name"]}):
            leave_types_collection.insert_one(leave_type)
    
    # Create default expense categories
    default_expense_categories = [
        {"category_id": str(uuid.uuid4()), "name": "Travel", "description": "Travel expenses", "max_amount_per_month": 10000, "requires_receipt": True},
        {"category_id": str(uuid.uuid4()), "name": "Food", "description": "Meal expenses", "max_amount_per_month": 5000, "requires_receipt": True},
        {"category_id": str(uuid.uuid4()), "name": "Office Supplies", "description": "Office supply expenses", "max_amount_per_month": 3000, "requires_receipt": False},
        {"category_id": str(uuid.uuid4()), "name": "Client Meetings", "description": "Client meeting expenses", "max_amount_per_month": 8000, "requires_receipt": True},
        {"category_id": str(uuid.uuid4()), "name": "Miscellaneous", "description": "Other work-related expenses", "max_amount_per_month": 2000, "requires_receipt": False}
    ]
    
    for category in default_expense_categories:
        if not expense_categories_collection.find_one({"name": category["name"]}):
            expense_categories_collection.insert_one(category)

# Authentication endpoints
@app.post("/api/auth/register")
async def register(user: UserCreate):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "full_name": user.full_name,
        "employee_id": user.employee_id,
        "department_id": user.department_id,
        "role": user.role,
        "phone": user.phone,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "leave_balances": {}
    }
    
    users_collection.insert_one(user_doc)
    return {"message": "User registered successfully", "user_id": user_id}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["user_id"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": db_user["user_id"],
            "email": db_user["email"],
            "full_name": db_user["full_name"],
            "role": db_user["role"],
            "employee_id": db_user["employee_id"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "employee_id": current_user["employee_id"]
    }

# Leave Management endpoints
@app.get("/api/leave/types")
async def get_leave_types(current_user: dict = Depends(get_current_user)):
    leave_types = list(leave_types_collection.find({}, {"_id": 0}))
    return leave_types

@app.post("/api/leave/types")
async def create_leave_type(leave_type: LeaveTypeCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized to create leave types")
    
    type_id = str(uuid.uuid4())
    leave_type_doc = {
        "type_id": type_id,
        "name": leave_type.name,
        "description": leave_type.description,
        "max_days_per_year": leave_type.max_days_per_year,
        "carry_forward_days": leave_type.carry_forward_days,
        "is_paid": leave_type.is_paid,
        "requires_approval": leave_type.requires_approval,
        "supports_half_day": True,
        "supports_wfh": leave_type.name.lower() == "work from home",
        "created_at": datetime.utcnow()
    }
    
    leave_types_collection.insert_one(leave_type_doc)
    return {"message": "Leave type created successfully", "type_id": type_id}

@app.post("/api/leave/request")
async def apply_leave(leave_request: LeaveRequest, current_user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    
    # Validate leave type
    leave_type = leave_types_collection.find_one({"type_id": leave_request.leave_type_id})
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    leave_doc = {
        "request_id": request_id,
        "user_id": current_user["user_id"],
        "leave_type_id": leave_request.leave_type_id,
        "start_date": leave_request.start_date,
        "end_date": leave_request.end_date,
        "duration_type": leave_request.duration_type,
        "reason": leave_request.reason,
        "status": "pending",
        "manager_id": leave_request.manager_id,
        "applied_at": datetime.utcnow(),
        "approved_at": None,
        "approved_by": None
    }
    
    leave_requests_collection.insert_one(leave_doc)
    return {"message": "Leave request submitted successfully", "request_id": request_id}

@app.get("/api/leave/requests")
async def get_leave_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "employee":
        requests = list(leave_requests_collection.find({"user_id": current_user["user_id"]}, {"_id": 0}))
    else:
        requests = list(leave_requests_collection.find({}, {"_id": 0}))
    
    # Enrich with user and leave type information
    for request in requests:
        user = users_collection.find_one({"user_id": request["user_id"]})
        leave_type = leave_types_collection.find_one({"type_id": request["leave_type_id"]})
        if user:
            request["user_name"] = user["full_name"]
            request["employee_id"] = user["employee_id"]
        if leave_type:
            request["leave_type_name"] = leave_type["name"]
    
    return requests

@app.put("/api/leave/requests/{request_id}")
async def update_leave_request(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve/reject leave requests")
    
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    update_data = {
        "status": status,
        "approved_by": current_user["user_id"],
        "approved_at": datetime.utcnow()
    }
    
    result = leave_requests_collection.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    return {"message": f"Leave request {status} successfully"}

# Expense Management endpoints
@app.post("/api/expense/request")
async def submit_expense(expense_request: ExpenseRequest, current_user: dict = Depends(get_current_user)):
    request_id = str(uuid.uuid4())
    
    # Validate expense category
    category = expense_categories_collection.find_one({"category_id": expense_request.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Expense category not found")
    
    expense_doc = {
        "request_id": request_id,
        "user_id": current_user["user_id"],
        "category_id": expense_request.category_id,
        "amount": expense_request.amount,
        "expense_date": expense_request.expense_date,
        "description": expense_request.description,
        "status": "pending",
        "manager_id": expense_request.manager_id,
        "submitted_at": datetime.utcnow(),
        "approved_at": None,
        "approved_by": None,
        "receipt_url": None
    }
    
    expense_requests_collection.insert_one(expense_doc)
    return {"message": "Expense request submitted successfully", "request_id": request_id}

@app.get("/api/expense/requests")
async def get_expense_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "employee":
        requests = list(expense_requests_collection.find({"user_id": current_user["user_id"]}, {"_id": 0}))
    else:
        requests = list(expense_requests_collection.find({}, {"_id": 0}))
    
    # Enrich with user and category information
    for request in requests:
        user = users_collection.find_one({"user_id": request["user_id"]})
        category = expense_categories_collection.find_one({"category_id": request["category_id"]})
        if user:
            request["user_name"] = user["full_name"]
            request["employee_id"] = user["employee_id"]
        if category:
            request["category_name"] = category["name"]
    
    return requests

@app.get("/api/expense/categories")
async def get_expense_categories(current_user: dict = Depends(get_current_user)):
    categories = list(expense_categories_collection.find({}, {"_id": 0}))
    return categories

@app.put("/api/expense/requests/{request_id}")
async def update_expense_request(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve/reject expense requests")
    
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    update_data = {
        "status": status,
        "approved_by": current_user["user_id"],
        "approved_at": datetime.utcnow()
    }
    
    result = expense_requests_collection.update_one(
        {"request_id": request_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense request not found")
    
    return {"message": f"Expense request {status} successfully"}

# File upload for receipts
@app.post("/api/expense/upload-receipt/{request_id}")
async def upload_receipt(request_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Check if expense request exists and belongs to user
    expense = expense_requests_collection.find_one({"request_id": request_id, "user_id": current_user["user_id"]})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense request not found")
    
    # Validate file type
    if not file.content_type.startswith(('image/', 'application/pdf')):
        raise HTTPException(status_code=400, detail="Only image and PDF files are allowed")
    
    # Create filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"receipt_{request_id}_{int(datetime.utcnow().timestamp())}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Update expense request with receipt URL
    receipt_url = f"/uploads/{filename}"
    expense_requests_collection.update_one(
        {"request_id": request_id},
        {"$set": {"receipt_url": receipt_url}}
    )
    
    return {"message": "Receipt uploaded successfully", "receipt_url": receipt_url}

# Attendance endpoints
@app.post("/api/attendance/log")
async def log_attendance(attendance: AttendanceLog, current_user: dict = Depends(get_current_user)):
    log_id = str(uuid.uuid4())
    
    # Check if already checked in/out today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    existing_log = attendance_collection.find_one({
        "user_id": current_user["user_id"],
        "action": attendance.action,
        "timestamp": {"$gte": today_start, "$lt": today_end}
    })
    
    if existing_log:
        raise HTTPException(status_code=400, detail=f"Already {attendance.action.replace('_', ' ')} today")
    
    attendance_doc = {
        "log_id": log_id,
        "user_id": current_user["user_id"],
        "action": attendance.action,
        "timestamp": datetime.utcnow(),
        "location": attendance.location,
        "date": datetime.utcnow().date().isoformat()
    }
    
    attendance_collection.insert_one(attendance_doc)
    return {"message": f"Successfully {attendance.action.replace('_', ' ')}", "log_id": log_id}

@app.get("/api/attendance/logs")
async def get_attendance_logs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "employee":
        logs = list(attendance_collection.find({"user_id": current_user["user_id"]}, {"_id": 0}).sort("timestamp", -1))
    else:
        logs = list(attendance_collection.find({}, {"_id": 0}).sort("timestamp", -1))
        # Enrich with user information for managers/admins
        for log in logs:
            user = users_collection.find_one({"user_id": log["user_id"]})
            if user:
                log["user_name"] = user["full_name"]
                log["employee_id"] = user["employee_id"]
    
    return logs

@app.get("/api/attendance/status")
async def get_attendance_status(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().date().isoformat()
    
    check_in = attendance_collection.find_one({
        "user_id": current_user["user_id"],
        "action": "check_in",
        "date": today
    })
    
    check_out = attendance_collection.find_one({
        "user_id": current_user["user_id"],
        "action": "check_out", 
        "date": today
    })
    
    return {
        "checked_in": check_in is not None,
        "checked_out": check_out is not None,
        "check_in_time": check_in["timestamp"] if check_in else None,
        "check_out_time": check_out["timestamp"] if check_out else None
    }

# Reports and Analytics endpoints
@app.get("/api/reports/leave-summary")
async def get_leave_summary(current_user: dict = Depends(get_current_user)):
    # Leave requests by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$project": {"status": "$_id", "count": 1, "_id": 0}}
    ]
    status_counts = list(leave_requests_collection.aggregate(pipeline))
    
    # Leave requests by type
    type_pipeline = [
        {"$group": {"_id": "$leave_type_id", "count": {"$sum": 1}}}
    ]
    type_counts = list(leave_requests_collection.aggregate(type_pipeline))
    
    # Enrich type counts with leave type names
    for item in type_counts:
        leave_type = leave_types_collection.find_one({"type_id": item["_id"]})
        item["type_name"] = leave_type["name"] if leave_type else "Unknown"
    
    return {
        "by_status": status_counts,
        "by_type": type_counts
    }

@app.get("/api/reports/expense-summary")
async def get_expense_summary(current_user: dict = Depends(get_current_user)):
    # Expense requests by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "total_amount": {"$sum": "$amount"}}},
        {"$project": {"status": "$_id", "count": 1, "total_amount": 1, "_id": 0}}
    ]
    status_counts = list(expense_requests_collection.aggregate(pipeline))
    
    # Expense requests by category
    category_pipeline = [
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}, "total_amount": {"$sum": "$amount"}}}
    ]
    category_counts = list(expense_requests_collection.aggregate(category_pipeline))
    
    # Enrich category counts
    for item in category_counts:
        category = expense_categories_collection.find_one({"category_id": item["_id"]})
        item["category_name"] = category["name"] if category else "Unknown"
    
    return {
        "by_status": status_counts,
        "by_category": category_counts
    }

# Admin Panel endpoints
@app.get("/api/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = list(users_collection.find({}, {"_id": 0, "password_hash": 0}))
    return users

@app.get("/api/admin/departments")
async def get_departments(current_user: dict = Depends(get_current_user)):
    departments = list(departments_collection.find({}, {"_id": 0}))
    return departments

@app.post("/api/admin/departments")
async def create_department(name: str, description: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    dept_id = str(uuid.uuid4())
    department_doc = {
        "dept_id": dept_id,
        "name": name,
        "description": description,
        "manager_id": None,
        "created_at": datetime.utcnow()
    }
    
    departments_collection.insert_one(department_doc)
    return {"message": "Department created successfully", "dept_id": dept_id}

@app.delete("/api/admin/leave-types/{type_id}")
async def delete_leave_type(type_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = leave_types_collection.delete_one({"type_id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    return {"message": "Leave type deleted successfully"}

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
