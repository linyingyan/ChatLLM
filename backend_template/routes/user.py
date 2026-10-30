from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from backend_template.database import get_db
from backend_template.database.user import User
from backend_template.config.jwt_config import settings
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.utils import get_authorization_scheme_param

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 安全方案
security = HTTPBearer()

# Pydantic模型
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int

class UserInfo(BaseModel):
    id: int
    username: str

# 工具函数
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_token_from_header(request: Request):
    """从请求头中获取token"""
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    
    scheme, token = get_authorization_scheme_param(authorization)
    if not authorization or scheme.lower() != "bearer":
        return None
    
    return token

async def get_current_user(
    request: Request, 
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. 获取Token
        authorization = request.headers.get("Authorization")
        if not authorization:
            print("错误: 请求头缺少Authorization")
            raise credentials_exception
        
        scheme, token = get_authorization_scheme_param(authorization)
        if not (authorization and scheme.lower() == "bearer"):
            print(f"错误: 无效的Authorization头格式: {authorization}")
            raise credentials_exception

        # 2. 解码Token
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            username: str = payload.get("sub")
            if not username:
                print("错误: Token中缺少sub字段")
                raise credentials_exception
        except jwt.ExpiredSignatureError:
            print("错误: Token已过期")
            raise HTTPException(
                status_code=401,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTError as e:
            print(f"JWT解码错误: {str(e)}")
            raise credentials_exception

        # 3. 验证用户存在
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"错误: 用户不存在: {username}")
            raise credentials_exception
            
        return user
        
    except Exception as e:
        print(f"认证过程中出现意外错误: {str(e)}")
        raise credentials_exception

# 路由端点
@router.post('/register')
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 检查用户是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Username already registered'
        )
    # 创建新用户
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {'message': '用户注册成功'}

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    # 验证用户
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id
    }

@router.get("/me", response_model=UserInfo)
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    获取当前登录用户的信息
    
    参数:
        request: 请求对象
        current_user: 通过认证的当前用户对象
        
    返回:
        UserInfo: 包含用户ID和用户名的对象
    """
    return {
        "id": current_user.id,
        "username": current_user.username
    }