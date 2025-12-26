function modal_cat_a(sub_cat) {
  // Compute content based on sub_cat
  for (let i = 1; i <= 5; i++) {
    // Set paragraph
    const paraEl = document.getElementById(`modal-para-a-${i}`);
    if (paraEl) {
      paraEl.innerHTML = `This is paragraph ${i} for Category A with sub-category "${sub_cat}". Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
    }

    // Draw on canvas
    const canvas = document.getElementById(`modal-canvas-a-${i}`);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Example drawing: filled rectangle with text
      ctx.fillStyle = '#0d6efd';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Fira Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Canvas A-${i} (${sub_cat})`, canvas.width / 2, canvas.height / 2);
    }
  }

  // Show modal
  const modalEl = document.getElementById('categoryAModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}