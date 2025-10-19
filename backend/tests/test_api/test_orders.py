import pytest
from app.models.user import User, UserRole
from app.models.product import Product, ProductCategory
from app.models.order import Order, OrderItem, OrderStatus
from app.services.auth import get_password_hash


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing"""
    user = User(
        email="admin@test.com",
        name="Admin User",
        hashed_password=get_password_hash("admin123"),
        role=UserRole.admin,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db):
    """Create a regular user for testing"""
    user = User(
        email="user@test.com",
        name="Regular User",
        hashed_password=get_password_hash("user123"),
        role=UserRole.user,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def customer_user(db):
    """Create a customer user for testing"""
    user = User(
        email="customer@test.com",
        name="Customer User",
        hashed_password=get_password_hash("customer123"),
        role=UserRole.customer,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def customer2_user(db):
    """Create a second customer user for testing"""
    user = User(
        email="customer2@test.com",
        name="Customer Two",
        hashed_password=get_password_hash("customer123"),
        role=UserRole.customer,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(client, admin_user):
    """Get authentication token for admin user"""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    return response.json()["token"]


@pytest.fixture
def user_token(client, regular_user):
    """Get authentication token for regular user"""
    response = client.post(
        "/api/auth/login",
        json={"email": "user@test.com", "password": "user123"}
    )
    return response.json()["token"]


@pytest.fixture
def customer_token(client, customer_user):
    """Get authentication token for customer user"""
    response = client.post(
        "/api/auth/login",
        json={"email": "customer@test.com", "password": "customer123"}
    )
    return response.json()["token"]


@pytest.fixture
def customer2_token(client, customer2_user):
    """Get authentication token for second customer user"""
    response = client.post(
        "/api/auth/login",
        json={"email": "customer2@test.com", "password": "customer123"}
    )
    return response.json()["token"]


@pytest.fixture
def product_with_inventory(db, admin_user):
    """Create a product with sufficient inventory"""
    product = Product(
        name="Fresh Eggs",
        description="Farm fresh eggs",
        category=ProductCategory.EGGS,
        price=5.99,
        inventory_quantity=100,
        unit="dozen",
        sku="EGG-001",
        is_active=1,
        created_by_id=admin_user.id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@pytest.fixture
def product_low_inventory(db, admin_user):
    """Create a product with low inventory"""
    product = Product(
        name="Raw Honey",
        description="Pure raw honey",
        category=ProductCategory.HONEY,
        price=12.99,
        inventory_quantity=5,
        unit="jar",
        sku="HON-001",
        is_active=1,
        created_by_id=admin_user.id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@pytest.fixture
def inactive_product(db, admin_user):
    """Create an inactive product"""
    product = Product(
        name="Discontinued Product",
        category=ProductCategory.OTHER,
        price=9.99,
        inventory_quantity=50,
        unit="each",
        is_active=0,
        created_by_id=admin_user.id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


class TestOrderCreate:
    """Test order creation"""

    def test_create_order_with_inventory(self, client, customer_token, product_with_inventory, db):
        """Create order with sufficient inventory"""
        initial_inventory = product_with_inventory.inventory_quantity

        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "items": [
                    {"product_id": product_with_inventory.id, "quantity": 10}
                ],
                "notes": "Please deliver before noon"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["total_amount"] == 5.99 * 10
        assert len(data["items"]) == 1
        assert data["items"][0]["is_backorder"] is False
        assert data["notes"] == "Please deliver before noon"

        # Verify inventory was reduced
        db.refresh(product_with_inventory)
        assert product_with_inventory.inventory_quantity == initial_inventory - 10

    def test_create_order_backorder(self, client, customer_token, product_low_inventory, db):
        """Create order with insufficient inventory triggers backorder"""
        initial_inventory = product_low_inventory.inventory_quantity

        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "items": [
                    {"product_id": product_low_inventory.id, "quantity": 10}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["is_backorder"] is True

        # Verify inventory was NOT reduced for backorder
        db.refresh(product_low_inventory)
        assert product_low_inventory.inventory_quantity == initial_inventory

    def test_create_order_mixed_inventory(self, client, customer_token, product_with_inventory, product_low_inventory):
        """Create order with mix of in-stock and backorder items"""
        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "items": [
                    {"product_id": product_with_inventory.id, "quantity": 5},
                    {"product_id": product_low_inventory.id, "quantity": 10}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2

        # First item should be in stock
        in_stock_item = next(i for i in data["items"] if i["product_id"] == product_with_inventory.id)
        assert in_stock_item["is_backorder"] is False

        # Second item should be backorder
        backorder_item = next(i for i in data["items"] if i["product_id"] == product_low_inventory.id)
        assert backorder_item["is_backorder"] is True

    def test_create_order_inactive_product(self, client, customer_token, inactive_product):
        """Cannot order inactive product"""
        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "items": [
                    {"product_id": inactive_product.id, "quantity": 1}
                ]
            }
        )
        assert response.status_code == 400
        assert "not available" in response.json()["detail"].lower()

    def test_create_order_nonexistent_product(self, client, customer_token):
        """Cannot order nonexistent product"""
        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "items": [
                    {"product_id": 99999, "quantity": 1}
                ]
            }
        )
        assert response.status_code == 404

    def test_create_empty_order(self, client, customer_token):
        """Cannot create order with no items"""
        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"items": []}
        )
        assert response.status_code == 400

    def test_order_number_generation(self, client, customer_token, product_with_inventory):
        """Order number is generated automatically"""
        response = client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "items": [{"product_id": product_with_inventory.id, "quantity": 1}]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["order_number"].startswith("ORD-")


class TestOrderRead:
    """Test order retrieval"""

    def test_customer_sees_own_orders(self, client, customer_token, db, customer_user, product_with_inventory):
        """Customer can only see their own orders"""
        # Create order for customer
        order = Order(
            order_number="ORD-TEST-001",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()

        response = client.get(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert len(orders) == 1
        assert all(o["customer_id"] == customer_user.id for o in orders)

    def test_customer_cannot_see_other_orders(self, client, customer_token, customer2_token, db, customer_user, customer2_user, product_with_inventory):
        """Customer cannot see other customers' orders"""
        # Create order for customer2
        order = Order(
            order_number="ORD-TEST-002",
            customer_id=customer2_user.id,
            status=OrderStatus.PENDING,
            total_amount=50.00
        )
        db.add(order)
        db.commit()

        # Customer 1 should not see customer 2's orders
        response = client.get(
            "/api/orders",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert len(orders) == 0

    def test_admin_sees_all_orders(self, client, admin_token, db, customer_user, customer2_user):
        """Admin can see all orders"""
        # Create orders for different customers
        order1 = Order(
            order_number="ORD-TEST-003",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        order2 = Order(
            order_number="ORD-TEST-004",
            customer_id=customer2_user.id,
            status=OrderStatus.CONFIRMED,
            total_amount=200.00
        )
        db.add_all([order1, order2])
        db.commit()

        response = client.get(
            "/api/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert len(orders) >= 2

    def test_filter_orders_by_status(self, client, admin_token, db, customer_user):
        """Filter orders by status"""
        order1 = Order(
            order_number="ORD-TEST-005",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        order2 = Order(
            order_number="ORD-TEST-006",
            customer_id=customer_user.id,
            status=OrderStatus.COMPLETED,
            total_amount=200.00
        )
        db.add_all([order1, order2])
        db.commit()

        response = client.get(
            "/api/orders?status=completed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert all(o["status"] == "completed" for o in orders)

    def test_get_order_by_id(self, client, customer_token, db, customer_user, product_with_inventory):
        """Get specific order by ID"""
        order = Order(
            order_number="ORD-TEST-007",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.get(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == order.id

    def test_customer_cannot_view_other_order(self, client, customer_token, db, customer2_user):
        """Customer cannot view another customer's order"""
        order = Order(
            order_number="ORD-TEST-008",
            customer_id=customer2_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.get(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403


class TestOrderUpdate:
    """Test order updates"""

    def test_admin_can_update_status(self, client, admin_token, db, customer_user):
        """Admin can update order status"""
        order = Order(
            order_number="ORD-TEST-009",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.put(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "confirmed"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"

    def test_user_can_update_status(self, client, user_token, db, customer_user):
        """Regular user can update order status"""
        order = Order(
            order_number="ORD-TEST-010",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.put(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"status": "processing"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"

    def test_customer_cannot_update_status(self, client, customer_token, db, customer_user):
        """Customer cannot update order status"""
        order = Order(
            order_number="ORD-TEST-011",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.put(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"status": "confirmed"}
        )
        assert response.status_code == 403


class TestOrderDelete:
    """Test order deletion"""

    def test_admin_can_delete_order(self, client, admin_token, db, customer_user):
        """Admin can delete orders"""
        order = Order(
            order_number="ORD-TEST-012",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.delete(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

    def test_user_cannot_delete_order(self, client, user_token, db, customer_user):
        """Regular user cannot delete orders"""
        order = Order(
            order_number="ORD-TEST-013",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        response = client.delete(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403

    def test_delete_order_restores_inventory(self, client, admin_token, db, admin_user, customer_user):
        """Deleting an order restores inventory for non-backorder items"""
        # Create product with inventory
        product = Product(
            name="Test Product",
            category=ProductCategory.OTHER,
            price=10.00,
            inventory_quantity=100,
            unit="each",
            is_active=1,
            created_by_id=admin_user.id
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        # Create order with item
        order = Order(
            order_number="ORD-TEST-014",
            customer_id=customer_user.id,
            status=OrderStatus.PENDING,
            total_amount=100.00
        )
        order_item = OrderItem(
            product_id=product.id,
            quantity=10,
            unit_price=10.00,
            is_backorder=0
        )
        order.items = [order_item]

        db.add(order)
        db.commit()

        # Reduce inventory manually (simulating order creation)
        product.inventory_quantity -= 10
        db.commit()

        initial_inventory = product.inventory_quantity

        # Delete order
        response = client.delete(
            f"/api/orders/{order.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

        # Verify inventory was restored
        db.refresh(product)
        assert product.inventory_quantity == initial_inventory + 10
