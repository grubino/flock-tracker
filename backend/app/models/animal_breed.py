from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class AnimalBreedComponent(Base):
    __tablename__ = "animal_breed_components"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id", ondelete="CASCADE"), nullable=False, index=True)
    breed_name = Column(String, nullable=False)
    percentage = Column(Float, nullable=True)  # 0-100; null means unknown proportion

    created_at = Column(DateTime, default=func.now())

    animal = relationship("Animal", back_populates="breed_components")

    def __repr__(self):
        pct = f" {self.percentage}%" if self.percentage is not None else ""
        return f"<AnimalBreedComponent(animal_id={self.animal_id}, breed='{self.breed_name}'{pct})>"
