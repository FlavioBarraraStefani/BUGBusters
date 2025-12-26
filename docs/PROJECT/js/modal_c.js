function modal_cat_c(sub_cat) {
  // Compute content based on sub_cat
  for (let i = 1; i <= 5; i++) {
    // Set paragraph
    const paraEl = document.getElementById(`modal-para-c-${i}`);
    if (paraEl) {
      paraEl.innerHTML = `This is paragraph ${i} for Category C with sub-category "${sub_cat}". Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`;
    }

    // Draw on canvas
    const canvas = document.getElementById(`modal-canvas-c-${i}`);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Example drawing: filled rectangle with text
      ctx.fillStyle = '#dc3545';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Fira Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Canvas C-${i} (${sub_cat})`, canvas.width / 2, canvas.height / 2);
    }
  }

  // Show modal
  const modalEl = document.getElementById('categoryCModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}