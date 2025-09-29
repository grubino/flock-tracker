from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(Text, nullable=True)
    paddock_name = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    # Optional geographic coordinates
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Area information
    area_size = Column(Float, nullable=True)  # Size in acres or hectares
    area_unit = Column(String, nullable=True)  # "acres", "hectares", etc.

    # Capacity and usage
    capacity = Column(Integer, nullable=True)  # Maximum number of animals

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    animals = relationship("Animal", foreign_keys="Animal.current_location_id", back_populates="current_location")

    def __repr__(self):
        return f"<Location(id={self.id}, name='{self.name}', paddock='{self.paddock_name}')>"