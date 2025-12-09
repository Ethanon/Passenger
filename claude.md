# Code Architecture & Standards Guide

## Core Identity
You are working with a principal software architect with 20+ years of experience on a mature codebase. All code must follow established patterns and maintain architectural consistency.

## Design Principles (Non-Negotiable)
- **SOLID principles** - especially Single Responsibility and Dependency Inversion
- **DRY** - eliminate duplication through proper abstraction
- **Clean Architecture** - dependencies flow inward, business logic isolated
- **.NET/C# conventions** - apply these naming and structural patterns regardless of language
- **Clean Code** - Inline logic, no unnecessary variables or complexity
- **YAGNI** - You Aren't Gonna Need It - don't add features until they're actually needed

## Simplicity First
- **Zero lines of code is the goal**: Less is more. Question every line added
- **Single-line expressions preferred**: Avoid temporary variables unless they significantly improve readability
  - ✅ `this.pendingSync = !(await foo() && await bar());`
  - ❌ `const fooResult = await foo(); const barResult = await bar(); const success = fooResult && barResult; this.pendingSync = !success;`

## Error Handling Philosophy

```csharp
// GOOD - Handle at source, return valid empty collections
public List<Customer> GetActiveCustomers()
{
    return database.IsConnected()
        ? database.Query<Customer>("SELECT * FROM Customers WHERE Active = 1")
        : new List<Customer>();
}

// BAD - Throwing exceptions for expected scenarios
public List<Customer> GetActiveCustomers()
{
    if (!database.IsConnected())
        throw new DatabaseException("Connection failed");
    return database.Query<Customer>("SELECT * FROM Customers WHERE Active = 1");
}
```

### Rules:
1. **No null returns** - return empty collections, default objects, or Optional<T> patterns
2. **Exceptions only for truly exceptional cases** - not for business logic flows
3. **Validate at boundaries** - check inputs at method entry, not at consumption
4. **Fail fast** - detect problems immediately, don't propagate invalid state

## Code Style Standards

### Conciseness & Clarity
```csharp
// GOOD - Single line, clear intent
var activeUsers = users.Where(u => u.IsActive && u.LastLogin > cutoffDate).ToList();

// BAD - Verbose without benefit
var activeUsers = new List<User>();
foreach (var user in users)
{
    if (user.IsActive == true)
    {
        if (user.LastLogin > cutoffDate)
        {
            activeUsers.Add(user);
        }
    }
}
```

### Naming Conventions
- **Methods**: `CalculateMonthlyRevenue()`, `ValidateUserInput()`
- **Properties**: `IsActive`, `CustomerCount`, `LastModifiedDate`
- **Variables**: `activeCustomers`, `totalRevenue`, `validationResult`
- **Classes**: `CustomerService`, `PaymentProcessor`, `ValidationResult`

### Comments Policy
- Use descriptive method and variable names instead of comments
- Only add comments for complex business logic or non-obvious algorithms
- Never add comments that simply restate what the code does
- Prefer self-documenting code over explanatory comments

```csharp
// GOOD - Self-documenting
var eligibleCustomersForDiscount = customers
    .Where(c => c.TotalPurchases > minimumPurchaseThreshold)
    .Where(c => c.LastPurchaseDate > DateTime.Now.AddMonths(-6));

// BAD - Unnecessary comments
// Get all customers
var customers = GetCustomers();
// Loop through each customer
foreach (var customer in customers)
{
    // Check if customer is active
    if (customer.IsActive)
    {
        // Process the customer
        ProcessCustomer(customer);
    }
}
```

## Code Review Mindset
- **Assume existing code is correct**: The codebase reflects 20+ years of deliberate decisions
- **Verify improvements**: Before changing code, confirm the change actually improves it
- **Minimal fixes only**: Fix the specific bug, nothing more
- **No refactoring unless requested**: Don't "clean up" surrounding code, add comments where none exist, or restructure working code

## What NOT to Do
- Don't add try-catch blocks unless error handling is explicitly broken
- Don't restructure if-else blocks that work fine
- Don't split single-line operations into multiple variables "for clarity"
- Don't add abstractions, helpers, or utility functions for one-time operations
- Don't add defensive programming (null checks, validation) for internal code paths
- Don't make error messages "user-friendly" unless that's the specific task
- Don't use icons or emojis in code or output
- Don't add excessive print/console statements

## When to Use Temporary Variables
Only when it genuinely improves readability:
- Complex nested expressions that are hard to parse
- Values used multiple times
- Debugging purposes (temporarily)

## Change Management Rules

### Scope Control
1. **Minimal viable change** - solve only the current problem
2. **No opportunistic refactoring** - resist the urge to "improve" unrelated code
3. **Interface evolution allowed** - we control all consumers, breaking changes are acceptable if they improve design

### Impact Assessment Process
Before making changes:
1. Identify all consumers of the code you're modifying
2. Trace data flow - understand how changes propagate through layers
3. Verify assumptions - check that your understanding matches actual usage
4. Test critical paths - ensure core functionality remains intact

## Implementation Checklist

For every change, verify:
- Follows existing naming conventions in the file/project
- Error handling at appropriate layer (closest to data source)
- Returns valid objects (never null for collections/complex types)
- Single responsibility maintained
- No unnecessary try/catch blocks
- Minimal code footprint
- All consumers of changed interfaces updated
- No regression in existing functionality
- Minimal or no comments added unless truly necessary

## Anti-Patterns to Avoid

```csharp
// BAD - Error handling at wrong layer
public void ProcessOrders()
{
    try {
        var orders = orderService.GetPendingOrders();
    } catch (DatabaseException ex) {
        // Wrong place for this handling
    }
}

// BAD - Null returns
public Customer GetCustomer(int id) => database.Find(id);

// BAD - Verbose when concise is clear
if (customer.IsActive == true) { return true; } else { return false; }
// Should be: return customer.IsActive;

// BAD - Unnecessary comments
// This method calculates the total
public decimal CalculateTotal(List<Item> items)
{
    // Initialize sum to zero
    decimal sum = 0;
    // Loop through all items
    foreach (var item in items)
    {
        // Add item price to sum
        sum += item.Price;
    }
    // Return the calculated sum
    return sum;
}
```

## Context Awareness
- **Single deployment model** - breaking changes are acceptable
- **Team owns entire stack** - can modify any layer as needed
- **Established patterns exist** - follow them, don't reinvent
- **Performance matters** - prefer efficient solutions over academic purity

## Before You Code
1. **Understand the existing pattern** - how does similar functionality work?
2. **Identify the minimal change** - what's the smallest modification needed?
3. **Plan error scenarios** - what can go wrong and where should it be handled?
4. **Consider ripple effects** - what other code might be impacted?
5. **Never use icons or excessive print statements**

**Remember**: We value working software over perfect software. Make it work correctly first, following our established patterns. Let the code speak for itself through clear naming rather than excessive commenting.
