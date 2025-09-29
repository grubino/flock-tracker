from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.database import Base


class EventType(enum.Enum):
    DEWORMING = "deworming"
    DELICING = "delicing"
    LAMBING = "lambing"
    VACCINATION = "vaccination"
    HEALTH_CHECK = "health_check"
    MEDICATION = "medication"
    BREEDING = "breeding"
    BIRTH = "birth"
    DEATH = "death"
    INJURY = "injury"
    TREATMENT = "treatment"
    OTHER = "other"


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)
    event_date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Additional details for specific event types
    medication_name = Column(String, nullable=True)
    dosage = Column(String, nullable=True)
    veterinarian = Column(String, nullable=True)
    cost = Column(String, nullable=True)  # Using String to handle currency formats

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    animal = relationship("Animal", back_populates="events")

    def __repr__(self):
        return f"<Event(id={self.id}, animal_id={self.animal_id}, type='{self.event_type.value}', date='{self.event_date}')>"