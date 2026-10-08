document.addEventListener('DOMContentLoaded', () => {
  loadAdminOrders();
});

function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  // Retrieve orders from localStorage key 'fitLockerOrders'
  const orders = JSON.parse(localStorage.getItem('fitLockerOrders')) || [];

  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No orders found.</td></tr>`;
    return;
  }

  orders.forEach((order, index) => {
    // Format items list for display
    const itemsList = order.items 
      ? order.items.map(item => `${item.name} (x${item.quantity || 1})`).join(', ') 
      : 'N/A';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${order.id || index + 1}</strong></td>
      <td>${order.date || new Date().toLocaleDateString()}</td>
      <td>
        ${order.customerName || 'Guest'}<br>
        <small class="text-muted">${order.customerEmail || ''}</small>
      </td>
      <td><small>${itemsList}</small></td>
      <td>$${parseFloat(order.total || 0).toFixed(2)}</td>
      <td>
        <select class="status-select" data-index="${index}">
          <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="btn btn--secondary btn-sm save-status-btn" data-index="${index}">Update</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach event listeners to update buttons
  document.querySelectorAll('.save-status-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = e.target.getAttribute('data-index');
      updateOrderStatus(index);
    });
  });
}

function updateOrderStatus(index) {
  const selectElement = document.querySelector(`.status-select[data-index="${index}"]`);
  const newStatus = selectElement.value;

  let orders = JSON.parse(localStorage.getItem('fitLockerOrders')) || [];
  
  if (orders[index]) {
    orders[index].status = newStatus;
    // Save updated status back to fitLockerOrders
    localStorage.setItem('fitLockerOrders', JSON.stringify(orders));
    alert(`Order #${orders[index].id || index + 1} status updated to ${newStatus}`);
    loadAdminOrders();
  }
}