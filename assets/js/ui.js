// Switch between forms
function showForm(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error(`Form with ID "${formId}" not found`);
    return;
  }
  form.style.display = "block";
  clearErrors();
}

function clearErrors() {
  const el = document.getElementById("register-error");
  if (el) el.textContent = "";
}
