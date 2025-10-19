from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.product import Product, ProductCategory
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.auth import get_current_user, require_min_role

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("", response_model=ProductResponse, dependencies=[Depends(require_min_role(UserRole.user))])
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new product (users and admins only)"""
    # Check if SKU already exists
    if product.sku:
        existing = db.query(Product).filter(Product.sku == product.sku).first()
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")

    db_product = Product(
        **product.model_dump(),
        created_by_id=current_user.id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("", response_model=List[ProductResponse])
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[ProductCategory] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all products with optional filtering"""
    query = db.query(Product)

    # Customers can only see active products
    if current_user.role == UserRole.customer:
        query = query.filter(Product.is_active == 1)
    elif is_active is not None:
        query = query.filter(Product.is_active == (1 if is_active else 0))

    if category:
        query = query.filter(Product.category == category)

    if search:
        query = query.filter(
            Product.name.ilike(f"%{search}%") |
            Product.description.ilike(f"%{search}%")
        )

    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific product by ID"""
    query = db.query(Product).filter(Product.id == product_id)

    # Customers can only see active products
    if current_user.role == UserRole.customer:
        query = query.filter(Product.is_active == 1)

    product = query.first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse, dependencies=[Depends(require_min_role(UserRole.user))])
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a product (users and admins only)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if user is admin or product creator
    if current_user.role.value != "admin" and db_product.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this product")

    # Check SKU uniqueness if updating SKU
    if product_update.sku and product_update.sku != db_product.sku:
        existing = db.query(Product).filter(Product.sku == product_update.sku).first()
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists")

    update_data = product_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_id}", dependencies=[Depends(require_min_role(UserRole.user))])
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product (users and admins only)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if user is admin or product creator
    if current_user.role.value != "admin" and db_product.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this product")

    db.delete(db_product)
    db.commit()
    return {"message": "Product deleted successfully"}
