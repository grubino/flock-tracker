from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.database import Base


class AnimalType(enum.Enum):
    SHEEP = "sheep"
    CHICKEN = "chicken"
    HIVE = "hive"


class SheepGender(enum.Enum):
    EWE = "ewe"
    RAM = "ram"


class Animal(Base):
    __tablename__ = "animals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    tag_number = Column(String, unique=True, index=True, nullable=False)
    animal_type = Column(SQLEnum(AnimalType), nullable=False)
    sheep_gender = Column(SQLEnum(SheepGender), nullable=True)
    birth_date = Column(DateTime, nullable=True)
    is_sellable = Column(Boolean, default=False)

    # Current location
    current_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    # Lineage tracking
    sire_id = Column(Integer, ForeignKey("animals.id"), nullable=True)
    dam_id = Column(Integer, ForeignKey("animals.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    sire = relationship("Animal", foreign_keys=[sire_id], remote_side=[id], backref="sired_offspring")
    dam = relationship("Animal", foreign_keys=[dam_id], remote_side=[id], backref="dam_offspring")
    current_location = relationship("Location", foreign_keys=[current_location_id])
    events = relationship("Event", back_populates="animal", cascade="all, delete-orphan")
    photographs = relationship("Photograph", back_populates="animal", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Animal(id={self.id}, tag_number='{self.tag_number}', type='{self.animal_type.value}', name='{self.name}')>"