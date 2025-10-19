import pytest
from app.models.user import User, UserRole
from app.models.product import Product, ProductCategory
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
def sample_product(db, admin_user):
    """Create a sample product"""
    product = Product(
        name="Fresh Eggs",
        description="Farm fresh eggs from free-range chickens",
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


class TestProductCreate:
    """Test product creation"""

    def test_create_product_as_admin(self, client, admin_token):
        """Admin can create a product"""
        response = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Raw Honey",
                "description": "Pure raw honey from our hives",
                "category": "honey",
                "price": 12.99,
                "inventory_quantity": 50,
                "unit": "jar",
                "sku": "HON-001",
                "is_active": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Raw Honey"
        assert data["category"] == "honey"
        assert data["price"] == 12.99
        assert data["inventory_quantity"] == 50

    def test_create_product_as_user(self, client, user_token):
        """Regular user can create a product"""
        response = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "name": "Lamb Meat",
                "description": "Fresh lamb from grass-fed sheep",
                "category": "meat",
                "price": 15.99,
                "inventory_quantity": 25,
                "unit": "lb",
                "is_active": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Lamb Meat"

    def test_create_product_as_customer_fails(self, client, customer_token):
        """Customer cannot create a product"""
        response = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "name": "Test Product",
                "category": "other",
                "price": 9.99,
                "inventory_quantity": 10,
                "unit": "each",
                "is_active": True
            }
        )
        assert response.status_code == 403

    def test_create_product_duplicate_sku(self, client, admin_token, sample_product):
        """Cannot create product with duplicate SKU"""
        response = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Another Product",
                "category": "eggs",
                "price": 4.99,
                "inventory_quantity": 20,
                "unit": "dozen",
                "sku": "EGG-001",  # Duplicate SKU
                "is_active": True
            }
        )
        assert response.status_code == 400
        assert "SKU already exists" in response.json()["detail"]

    def test_create_product_negative_price(self, client, admin_token):
        """Cannot create product with negative price"""
        response = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Invalid Product",
                "category": "other",
                "price": -5.99,
                "inventory_quantity": 10,
                "unit": "each",
                "is_active": True
            }
        )
        assert response.status_code == 422  # Validation error


class TestProductRead:
    """Test product retrieval"""

    def test_get_all_products(self, client, customer_token, sample_product):
        """All authenticated users can get products"""
        response = client.get(
            "/api/products",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 1
        assert products[0]["name"] == "Fresh Eggs"

    def test_get_products_by_category(self, client, customer_token, sample_product):
        """Filter products by category"""
        response = client.get(
            "/api/products?category=eggs",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        products = response.json()
        assert all(p["category"] == "eggs" for p in products)

    def test_get_products_search(self, client, customer_token, sample_product):
        """Search products by name"""
        response = client.get(
            "/api/products?search=eggs",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 1
        assert "eggs" in products[0]["name"].lower()

    def test_get_product_by_id(self, client, customer_token, sample_product):
        """Get specific product by ID"""
        response = client.get(
            f"/api/products/{sample_product.id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        product = response.json()
        assert product["id"] == sample_product.id
        assert product["name"] == "Fresh Eggs"

    def test_get_nonexistent_product(self, client, customer_token):
        """Get nonexistent product returns 404"""
        response = client.get(
            "/api/products/99999",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 404


class TestProductUpdate:
    """Test product updates"""

    def test_update_product_as_creator(self, client, user_token, db, regular_user):
        """User can update their own product"""
        # Create product as regular user
        product = Product(
            name="Test Product",
            category=ProductCategory.OTHER,
            price=9.99,
            inventory_quantity=10,
            unit="each",
            is_active=1,
            created_by_id=regular_user.id
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        response = client.put(
            f"/api/products/{product.id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"price": 12.99, "inventory_quantity": 15}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["price"] == 12.99
        assert data["inventory_quantity"] == 15

    def test_update_product_as_admin(self, client, admin_token, sample_product):
        """Admin can update any product"""
        response = client.put(
            f"/api/products/{sample_product.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Updated Eggs", "price": 6.99}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Eggs"
        assert data["price"] == 6.99

    def test_update_product_wrong_user(self, client, user_token, sample_product):
        """User cannot update another user's product"""
        response = client.put(
            f"/api/products/{sample_product.id}",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"price": 10.99}
        )
        assert response.status_code == 403

    def test_update_product_as_customer_fails(self, client, customer_token, sample_product):
        """Customer cannot update products"""
        response = client.put(
            f"/api/products/{sample_product.id}",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"price": 10.99}
        )
        assert response.status_code == 403


class TestProductDelete:
    """Test product deletion"""

    def test_delete_product_as_creator(self, client, user_token, db, regular_user):
        """User can delete their own product"""
        product = Product(
            name="To Delete",
            category=ProductCategory.OTHER,
            price=9.99,
            inventory_quantity=5,
            unit="each",
            is_active=1,
            created_by_id=regular_user.id
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        response = client.delete(
            f"/api/products/{product.id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200

    def test_delete_product_as_admin(self, client, admin_token, sample_product):
        """Admin can delete any product"""
        response = client.delete(
            f"/api/products/{sample_product.id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

    def test_delete_product_wrong_user(self, client, user_token, sample_product):
        """User cannot delete another user's product"""
        response = client.delete(
            f"/api/products/{sample_product.id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403

    def test_delete_nonexistent_product(self, client, admin_token):
        """Deleting nonexistent product returns 404"""
        response = client.delete(
            "/api/products/99999",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
