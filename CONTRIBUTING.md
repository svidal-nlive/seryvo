# Contributing to Seryvo

First off, thank you for considering contributing to Seryvo! It's people like you that make Seryvo such a great platform.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to [conduct@seryvo.com](mailto:conduct@seryvo.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Python Version: [e.g. 3.11]
 - Docker Version: [e.g. 24.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

- **Use a clear and descriptive title**
- **Provide a step-by-step description** of the suggested enhancement
- **Provide specific examples** to demonstrate the steps
- **Describe the current behavior** and explain which behavior you expected to see instead
- **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repo** and create your branch from `main`.
2. **Install dependencies** and set up the development environment.
3. **Make your changes** following our coding standards.
4. **Add tests** for any new functionality.
5. **Ensure tests pass** by running `pytest`.
6. **Update documentation** if needed.
7. **Submit a pull request**!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/seryvo.git
cd seryvo

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies

# Set up pre-commit hooks
pre-commit install

# Run tests
pytest
```

## Coding Standards

### Python

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints for all function signatures
- Maximum line length: 100 characters
- Use docstrings for all public functions and classes

```python
# Good example
async def create_booking(
    db: AsyncSession,
    booking_data: BookingCreate,
    user_id: int
) -> Booking:
    """
    Create a new booking for a user.
    
    Args:
        db: Database session
        booking_data: Booking creation data
        user_id: ID of the user creating the booking
        
    Returns:
        The created booking object
        
    Raises:
        BookingError: If booking creation fails
    """
    ...
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(bookings): add scheduled ride support
fix(payments): handle Stripe webhook timeout
docs(readme): update installation instructions
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_bookings.py -v

# Run tests matching a pattern
pytest -k "test_create"
```

### Writing Tests

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_booking(client: AsyncClient, auth_headers: dict):
    """Test creating a new booking."""
    response = await client.post(
        "/api/v1/bookings",
        json={
            "pickup_location": {"lat": 40.7128, "lng": -74.0060},
            "dropoff_location": {"lat": 40.7580, "lng": -73.9855},
            "ride_type": "economy"
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["status"] == "pending"
```

## Project Structure

```
seryvo/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── bookings.py
│   │   │   ├── drivers.py
│   │   │   └── payments.py
│   │   ├── core/          # Business logic & services
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── stripe_service.py
│   │   │   └── email_service.py
│   │   ├── models/        # SQLAlchemy models
│   │   │   └── models.py
│   │   └── schemas/       # Pydantic schemas
│   │       └── schemas.py
│   ├── alembic/           # Database migrations
│   ├── tests/             # Test files
│   └── requirements.txt
├── docs/                   # Documentation
└── docker-compose.yml
```

## Getting Help

- **Discord**: [Join our Discord](https://discord.gg/seryvo)
- **GitHub Issues**: For bugs and feature requests
- **Email**: [dev@seryvo.com](mailto:dev@seryvo.com)

## Recognition

Contributors will be recognized in:
- Our README contributors section
- Release notes for significant contributions
- The Seryvo Hall of Fame (for major contributions)

Thank you for contributing! 🙏
