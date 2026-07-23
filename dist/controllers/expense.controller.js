"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpense = exports.remindExpense = exports.updateExpense = exports.getUserExpenses = exports.getGroupExpenses = exports.createExpense = void 0;
const expense_service_1 = require("../services/expense.service");
const error_handler_1 = require("../middleware/error-handler");
exports.createExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { group_id, amount, description, split_type, splits } = req.body;
    const userId = req.user.userId;
    const expense = await expense_service_1.expenseService.createExpense({
        group_id,
        payer_id: userId,
        amount,
        description,
        split_type,
        splits,
    });
    res.status(201).json(expense);
});
exports.getGroupExpenses = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const groupId = req.params.groupId;
    const userId = req.user.userId;
    const expenses = await expense_service_1.expenseService.getExpensesByGroup(groupId, userId);
    res.json(expenses);
});
exports.getUserExpenses = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const expenses = await expense_service_1.expenseService.getUserExpenses(userId);
    res.json(expenses);
});
exports.updateExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const { amount, description, split_type, splits, proof_url } = req.body;
    const userId = req.user.userId;
    // Check if it's just a proof_url update or a full update
    if (amount !== undefined) {
        const updated = await expense_service_1.expenseService.updateExpense(id, userId, {
            amount,
            description,
            split_type,
            splits,
            proof_url
        });
        res.json(updated);
    }
    else if (proof_url) {
        const updated = await expense_service_1.expenseService.updateProofUrl(id, proof_url);
        res.json(updated);
    }
    else {
        res.status(400).json({ message: "No update data provided" });
    }
});
exports.remindExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const result = await expense_service_1.expenseService.remindCreator(id, userId);
    res.json(result);
});
exports.deleteExpense = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    await expense_service_1.expenseService.deleteExpense(id, userId);
    res.status(204).send();
});
