function modal_cat_b(sub_cat) {
  // Compute content based on sub_cat
  for (let i = 1; i <= 5; i++) {
    // Set paragraph
    const paraEl = document.getElementById(`modal-para-b-${i}`);
    if (paraEl) {
      paraEl.innerHTML = `This is paragraph ${i} for Category B with sub-category "${sub_cat}". Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;
    }

    // Draw on canvas
    const canvas = document.getElementById(`modal-canvas-b-${i}`);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Example drawing: filled rectangle with text
      ctx.fillStyle = '#198754';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "Fira Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Canvas B-${i} (${sub_cat})`, canvas.width / 2, canvas.height / 2);
    }
  }

  // Show modal
  const modalEl = document.getElementById('categoryBModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}