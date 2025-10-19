from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.services.auth import get_current_user, require_min_role, require_role

router = APIRouter(prefix="/api/orders", tags=["orders"])


def generate_order_number() -> str:
    """Generate a unique order number"""
    return f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"


@router.post("", response_model=OrderResponse)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    if not order.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # Calculate total and validate products
    total_amount = 0.0
    order_items = []

    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        if not product.is_active:
            raise HTTPException(status_code=400, detail=f"Product {product.name} is not available")

        # Check inventory and set backorder flag
        is_backorder = item.quantity > product.inventory_quantity

        order_item = OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=product.price,
            is_backorder=1 if is_backorder else 0
        )
        order_items.append(order_item)
        total_amount += product.price * item.quantity

        # Reduce inventory if not a backorder
        if not is_backorder:
            product.inventory_quantity -= item.quantity

    # Create order
    db_order = Order(
        order_number=generate_order_number(),
        customer_id=current_user.id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        notes=order.notes,
        items=order_items
    )

    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.get("", response_model=List[OrderResponse])
def get_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get orders - customers see only their orders, users/admins see all"""
    query = db.query(Order)

    # Filter by customer for customer role
    if current_user.role.value == "customer":
        query = query.filter(Order.customer_id == current_user.id)

    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Customers can only see their own orders
    if current_user.role.value == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")

    return order


@router.put("/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_min_role(UserRole.user))])
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update order status (users and admins only)"""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = order_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_order, field, value)

    db.commit()
    db.refresh(db_order)
    return db_order


@router.delete("/{order_id}", dependencies=[Depends(require_role(UserRole.admin))])
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an order (admin only)"""
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Restore inventory for non-backorder items if order is not completed
    if db_order.status != OrderStatus.COMPLETED:
        for item in db_order.items:
            if not item.is_backorder:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.inventory_quantity += item.quantity

    db.delete(db_order)
    db.commit()
    return {"message": "Order deleted successfully"}
