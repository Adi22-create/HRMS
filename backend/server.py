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
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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
    return requests

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
