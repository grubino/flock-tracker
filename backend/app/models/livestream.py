from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class Livestream(Base):
    __tablename__ = "livestreams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Stream URL (RTSP or RTMP)
    stream_url = Column(String, nullable=False)
    stream_type = Column(String, nullable=False)  # "rtsp" or "rtmp"

    # Optional location association
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    # Stream status
    is_active = Column(Boolean, default=True)

    # Optional authentication
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    location = relationship("Location", backref="livestreams")

    def __repr__(self):
        return f"<Livestream(id={self.id}, name='{self.name}', type='{self.stream_type}')>"
