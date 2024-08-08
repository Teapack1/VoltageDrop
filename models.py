from sqlalchemy import Column, Integer, String, Float, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./database.db"

Base = declarative_base()

class Cable(Base):
    __tablename__ = "cables"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True, index=True)
    resistance = Column(Float)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
