from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class Photograph(Base):
    __tablename__ = "photographs"

    id = Column(Integer, primary_key=True, index=True)
    animal_id = Column(Integer, ForeignKey("animals.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    # Optional metadata
    caption = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    date_taken = Column(DateTime, nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)  # Primary photo for the animal

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    animal = relationship("Animal", back_populates="photographs")

    def __repr__(self):
        return f"<Photograph(id={self.id}, animal_id={self.animal_id}, filename='{self.filename}')>"