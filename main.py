from fastapi import FastAPI, Request, Depends, HTTPException, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
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

class MultipleCablesRequest(BaseModel):
    cables: List[VoltageDropRequest]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_voltage_drop(voltage, load, length, resistance):
    voltage_drop = load * length * resistance
    final_voltage = voltage - voltage_drop
    if final_voltage < 0:
        final_voltage = 0
    return final_voltage

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, db: Session = Depends(get_db)):
    cables = db.query(Cable).all()
    return templates.TemplateResponse("index.html", {"request": request, "cables": cables})

@app.post("/calculate")
async def calculate(request: MultipleCablesRequest, db: Session = Depends(get_db)):
    results = []
    for cable_request in request.cables:
        cable = db.query(Cable).filter(Cable.type == cable_request.cable_type).first()
        if not cable:
            raise HTTPException(status_code=400, detail="Invalid cable type")
        final_voltage = calculate_voltage_drop(cable_request.voltage, cable_request.load, cable_request.length, cable.resistance)
        results.append({"voltage_drop": cable_request.voltage - final_voltage})
    return results

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


@app.get("/cg", response_class=HTMLResponse)
async def cg_page(request: Request, db: Session = Depends(get_db)):
    cables = db.query(Cable).all()
    return templates.TemplateResponse("cg.html", {"request": request, "cables": cables})

@app.get("/get_resistance/{awg}", response_model=dict)
async def get_resistance(awg: str, db: Session = Depends(get_db)):
    cable = db.query(Cable).filter(Cable.type == awg).first()
    if not cable:
        raise HTTPException(status_code=404, detail="Cable type not found")
    return {"resistance": cable.resistance}
