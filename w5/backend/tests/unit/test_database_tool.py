"""
Unit tests for DatabaseQueryTool.

Tests the database query tool implementation for L3.
"""

import pytest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from tools import DatabaseQueryTool, ToolResult


# Use the seeded database
DB_PATH = str(Path(__file__).parent.parent.parent / "geekbrain.db")


class TestDatabaseQueryTool:
    """Test suite for DatabaseQueryTool."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.tool = DatabaseQueryTool(DB_PATH)
    
    def test_successful_query(self):
        """Test successful database query returns correct data."""
        result = self.tool.execute_query(
            "SELECT service, total_cost FROM monthly_costs WHERE service='PaymentGW' LIMIT 1"
        )
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) > 0
        assert 'service' in result.data[0]
        assert result.data[0]['service'] == 'PaymentGW'
    
    def test_q1_paymentgw_cost_query(self):
        """Test Q1 PaymentGW cost query returns exactly 16500."""
        result = self.tool.execute_query(
            "SELECT SUM(total_cost) as total FROM monthly_costs "
            "WHERE service='PaymentGW' AND month IN ('2026-01','2026-02','2026-03')"
        )
        
        assert result.success is True
        assert result.data is not None
        assert len(result.data) == 1
        assert result.data[0]['total'] == 16500.0
    
    def test_write_operations_rejected_insert(self):
        """Test INSERT operations are rejected."""
        result = self.tool.execute_query(
            "INSERT INTO monthly_costs (service, month, total_cost) VALUES ('Test', '2026-04', 1000)"
        )
        
        assert result.success is False
        assert result.error is not None
        assert "select" in result.error.lower() and "allowed" in result.error.lower()
    
    def test_write_operations_rejected_update(self):
        """Test UPDATE operations are rejected."""
        result = self.tool.execute_query(
            "UPDATE monthly_costs SET total_cost = 0 WHERE service='PaymentGW'"
        )
        
        assert result.success is False
        assert result.error is not None
        assert "select" in result.error.lower() and "allowed" in result.error.lower()
    
    def test_write_operations_rejected_delete(self):
        """Test DELETE operations are rejected."""
        result = self.tool.execute_query(
            "DELETE FROM monthly_costs WHERE service='PaymentGW'"
        )
        
        assert result.success is False
        assert result.error is not None
        assert "select" in result.error.lower() and "allowed" in result.error.lower()
    
    def test_write_operations_rejected_drop(self):
        """Test DROP operations are rejected."""
        result = self.tool.execute_query(
            "DROP TABLE monthly_costs"
        )
        
        assert result.success is False
        assert result.error is not None
        assert "select" in result.error.lower() and "allowed" in result.error.lower()
    
    def test_malformed_sql_returns_error(self):
        """Test malformed SQL returns descriptive error."""
        result = self.tool.execute_query(
            "SELCT * FORM monthly_costs"
        )
        
        assert result.success is False
        assert result.error is not None
        # Malformed SQL is caught by the SELECT validation first
        assert "select" in result.error.lower() and "allowed" in result.error.lower()
    
    def test_get_definition(self):
        """Test tool definition is correctly formatted."""
        definition = self.tool.get_definition()
        
        assert definition.name == "query_database"
        assert "historical" in definition.description.lower()
        assert "costs" in definition.description.lower()
        assert "incident" in definition.description.lower()  # "incident history" contains "incident"
        assert "sla" in definition.description.lower()
        assert "metrics" in definition.description.lower()
        assert "oct 2025" in definition.description.lower()
        assert "mar 2026" in definition.description.lower()
        
        # Check parameters schema
        assert definition.parameters["type"] == "object"
        assert "sql" in definition.parameters["properties"]
        assert definition.parameters["properties"]["sql"]["type"] == "string"
        assert "sql" in definition.parameters["required"]
    
    def test_select_with_clause_allowed(self):
        """Test WITH clause (CTE) is allowed as read-only."""
        result = self.tool.execute_query(
            "WITH costs AS (SELECT * FROM monthly_costs WHERE service='PaymentGW') "
            "SELECT SUM(total_cost) as total FROM costs"
        )
        
        assert result.success is True
        assert result.data is not None
    
    def test_empty_result_set(self):
        """Test query with no results returns empty list."""
        result = self.tool.execute_query(
            "SELECT * FROM monthly_costs WHERE service='NonExistentService'"
        )
        
        assert result.success is True
        assert result.data == []
    
    def test_multiple_rows_returned(self):
        """Test query returning multiple rows."""
        result = self.tool.execute_query(
            "SELECT service, month, total_cost FROM monthly_costs "
            "WHERE service='PaymentGW' ORDER BY month"
        )
        
        assert result.success is True
        assert len(result.data) >= 3  # At least Q1 2026 data
        assert all('service' in row for row in result.data)
        assert all('month' in row for row in result.data)
        assert all('total_cost' in row for row in result.data)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
