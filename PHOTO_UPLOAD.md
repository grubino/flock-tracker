# Photo Upload System

The Flock Tracker application includes a comprehensive photo upload system that supports uploading and managing photos for **all animal types**: sheep, chickens, and hives.

## Features

### ✅ **Already Fully Implemented**

The photo upload system is **already complete and functional** for all animal types. No additional development is needed.

### **Supported Animal Types**
- 🐑 **Sheep** - Upload photos of individual sheep
- 🐔 **Chickens** - Upload photos of individual chickens (hens and roosters)
- 🍯 **Hives** - Upload photos of beehives

### **Photo Management Features**
- **Multiple Photo Upload** - Upload multiple photos per animal
- **Primary Photo** - Set one photo as the primary/featured photo for each animal
- **Photo Metadata** - Add captions and descriptions to photos
- **Photo Gallery** - View all photos for an animal in a grid layout
- **Photo Viewing** - Click to view full-size photos
- **Photo Deletion** - Remove unwanted photos
- **File Validation** - Automatic validation of file types and sizes

## How to Upload Photos

### **Frontend (Web Interface)**

1. **Navigate to any animal detail page**:
   - Go to `/animals/{id}` for any sheep, chicken, or hive
   - The photo gallery and upload section appears automatically

2. **Upload photos**:
   - Click "Select Photos" button
   - Choose one or multiple image files
   - Add optional caption and description
   - Set as primary photo if desired
   - Click "Upload Photo"

3. **Manage photos**:
   - View all photos in the gallery grid
   - Click photos to view full size
   - Set different photos as primary
   - Delete unwanted photos

### **API Endpoints**

The backend provides REST API endpoints for programmatic access:

#### Upload Photo
```
POST /api/photographs/upload/{animal_id}
Content-Type: multipart/form-data

Form fields:
- file: Image file (required)
- caption: Optional caption text
- description: Optional description text
- is_primary: Boolean (set as primary photo)
```

#### Get Animal Photos
```
GET /api/photographs/animal/{animal_id}
```

#### Get Photo File
```
GET /api/photographs/{photo_id}/file
```

#### Update Photo Metadata
```
PUT /api/photographs/{photo_id}
```

#### Delete Photo
```
DELETE /api/photographs/{photo_id}
```

#### Set Primary Photo
```
POST /api/photographs/{photo_id}/set-primary
```

## File Requirements

### **Supported File Types**
- ✅ **JPEG** (.jpg, .jpeg)
- ✅ **PNG** (.png)
- ✅ **GIF** (.gif)
- ✅ **WebP** (.webp)

### **File Size Limits**
- **Maximum file size**: 10MB per photo
- **Automatic validation** prevents oversized uploads

### **Image Processing**
- **Automatic dimension detection** - Width and height stored in database
- **File validation** - MIME type and extension validation
- **Unique filenames** - Prevents naming conflicts

## Database Schema

Photos are stored with the following information:

```sql
CREATE TABLE photographs (
    id INTEGER PRIMARY KEY,
    animal_id INTEGER NOT NULL,           -- Links to any animal type
    filename VARCHAR NOT NULL,            -- Unique storage filename
    original_filename VARCHAR NOT NULL,   -- User's original filename
    file_path VARCHAR NOT NULL,          -- Full file system path
    file_size INTEGER NOT NULL,          -- Size in bytes
    mime_type VARCHAR NOT NULL,          -- image/jpeg, image/png, etc.
    width INTEGER,                       -- Image width in pixels
    height INTEGER,                      -- Image height in pixels
    caption TEXT,                        -- Optional caption
    description TEXT,                    -- Optional description
    date_taken DATETIME,                 -- Optional date photo was taken
    is_primary BOOLEAN DEFAULT FALSE,    -- Primary photo flag
    created_at DATETIME,                 -- Upload timestamp
    updated_at DATETIME                  -- Last modified timestamp
);
```

## File Storage

- **Location**: `uploads/photos/` directory on server
- **Naming**: UUID-based filenames prevent conflicts
- **Organization**: Flat directory structure with database indexing

## Examples

### Example: Upload Chicken Photo
```bash
curl -X POST "http://localhost:8000/api/photographs/upload/123" \
     -F "file=@my_chicken.jpg" \
     -F "caption=My favorite hen" \
     -F "description=This is Henrietta, she lays the best eggs" \
     -F "is_primary=true"
```

### Example: Get All Hive Photos
```bash
curl "http://localhost:8000/api/photographs/animal/456"
```

## Frontend Components

### **PhotoGallery Component**
- **Location**: `/src/components/PhotoGallery.tsx`
- **Usage**: `<PhotoGallery animalId={animal.id} />`
- **Features**: Grid display, full-screen viewing, photo management

### **PhotoUpload Component**
- **Location**: `/src/components/PhotoUpload.tsx`
- **Usage**: `<PhotoUpload animalId={animal.id} onUploadComplete={refetch} />`
- **Features**: Drag & drop, preview, metadata entry, progress tracking

## Integration

### **In Animal Detail Pages**
Photos are automatically included on all animal detail pages:

```jsx
// Already implemented in AnimalDetail.tsx
<PhotoGallery animalId={animal.id} />
```

This works for:
- **Sheep detail pages** (`/animals/{sheep_id}`)
- **Chicken detail pages** (`/animals/{chicken_id}`)
- **Hive detail pages** (`/animals/{hive_id}`)

## Summary

✅ **Photo uploads are fully functional for chickens and hives** (and sheep)
✅ **No additional development required**
✅ **All features work across all animal types**
✅ **Web interface and API are both complete**

The system is production-ready and handles all common photo management use cases for farm animal tracking.