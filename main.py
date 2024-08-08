from fastapi import FastAPI, Request, Depends, HTTPException, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models import Base, Cable, SessionLocal, init_db

app = FastAPI()

# Initialize the database
init_db()

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

class VoltageDropRequest(BaseModel):
    voltage: float
    load: float
    length: float
    cable_type: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_voltage_drop(voltage, load, length, resistance):
    return voltage - (load * length * resistance)

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, db: Session = Depends(get_db)):
    cables = db.query(Cable).all()
    return templates.TemplateResponse("index.html", {"request": request, "cables": cables})

@app.post("/calculate")
async def calculate(request: VoltageDropRequest, db: Session = Depends(get_db)):
    cable = db.query(Cable).filter(Cable.type == request.cable_type).first()
    if not cable:
        raise HTTPException(status_code=400, detail="Invalid cable type")
    result = calculate_voltage_drop(request.voltage, request.load, request.length, cable.resistance)
    return {"voltage_drop": result}

@app.get("/edit_cables", response_class=HTMLResponse)
async def edit_cables(request: Request, db: Session = Depends(get_db)):
    cables = db.query(Cable).all()
    return templates.TemplateResponse("edit_cables.html", {"request": request, "cables": cables})

@app.post("/add_cable")
async def add_cable(type: str = Form(...), resistance: float = Form(...), db: Session = Depends(get_db)):
    cable = Cable(type=type, resistance=resistance)
    db.add(cable)
    db.commit()
    return RedirectResponse(url="/edit_cables", status_code=303)

@app.post("/edit_cable/{cable_id}")
async def edit_cable(cable_id: int, type: str = Form(...), resistance: float = Form(...), db: Session = Depends(get_db)):
    cable = db.query(Cable).filter(Cable.id == cable_id).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable not found")
    cable.type = type
    cable.resistance = resistance
    db.commit()
    return RedirectResponse(url="/edit_cables", status_code=303)

@app.post("/delete_cable/{cable_id}")
async def delete_cable(cable_id: int, db: Session = Depends(get_db)):
    cable = db.query(Cable).filter(Cable.id == cable_id).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable not found")
    db.delete(cable)
    db.commit()
    return RedirectResponse(url="/edit_cables", status_code=303)
