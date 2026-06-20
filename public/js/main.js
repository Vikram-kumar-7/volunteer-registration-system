/**
 * Volunteer Registration System - Core Client JS
 */

document.addEventListener('DOMContentLoaded', () => {
  initPageFadeIn();
  initHamburgerMenu();
  initFlashMessages();
  initFloatingLabels();
  initInputFilters();
  initRealtimeValidation();
  initMultiStepForm();
  initConfetti();
  initCsvExport();
});

/**
 * 1. Page Entry Fade-In
 */
function initPageFadeIn() {
  const containers = document.querySelectorAll('.main-content, .split-container, .public-registration-container');
  containers.forEach(el => {
    el.classList.add('animate-fade-in');
  });
}

/**
 * 2. Mobile Sidebar Hamburger Menu Toggle
 */
function initHamburgerMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');

  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburgerBtn.classList.toggle('active');
      sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== hamburgerBtn) {
        hamburgerBtn.classList.remove('active');
        sidebar.classList.remove('active');
      }
    });
  }
}

/**
 * 3. Flash Messages Auto-Dismiss
 */
function initFlashMessages() {
  const flashMessages = document.querySelectorAll('.flash-message');
  flashMessages.forEach(msg => {
    // Auto-dismiss after 4 seconds
    const timeout = setTimeout(() => {
      dismissFlash(msg);
    }, 4000);

    // Close button click listener
    const closeBtn = msg.querySelector('.flash-dismiss-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        dismissFlash(msg);
      });
    }
  });
}

function dismissFlash(element) {
  element.classList.add('dismissing');
  element.addEventListener('animationend', () => {
    element.remove();
  });
}

/**
 * 4. Floating Labels Logic
 */
function initFloatingLabels() {
  const formGroups = document.querySelectorAll('.form-group.floating');

  formGroups.forEach(group => {
    const input = group.querySelector('.form-input');
    if (!input) return;

    // Set initial filled state (useful when pre-filling edit fields or validation failure values)
    if (input.value.trim() !== '') {
      group.classList.add('filled');
    }

    input.addEventListener('focus', () => {
      group.classList.add('active');
    });

    input.addEventListener('blur', () => {
      group.classList.remove('active');
      if (input.value.trim() !== '') {
        group.classList.add('filled');
      } else {
        group.classList.remove('filled');
      }
    });

    // Handle programmatically filled values or autocomplete
    input.addEventListener('input', () => {
      if (input.value.trim() !== '') {
        group.classList.add('filled');
      } else {
        group.classList.remove('filled');
      }
    });
  });
}

/**
 * 4b. Input Character Filtering (UX protection)
 */
function initInputFilters() {
  const nameInput = document.getElementById('fullName');
  const cityInput = document.getElementById('city');
  const ageInput = document.getElementById('age');
  const phoneInput = document.getElementById('phone');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      // Strip numbers and special chars, allow letters, spaces, hyphens, and dots
      nameInput.value = nameInput.value.replace(/[^a-zA-Z\s.-]/g, '');
    });
  }

  if (cityInput) {
    cityInput.addEventListener('input', () => {
      // Strip numbers, allow letters, spaces, hyphens, dots
      cityInput.value = cityInput.value.replace(/[^a-zA-Z\s.-]/g, '');
    });
  }

  if (ageInput) {
    ageInput.addEventListener('input', () => {
      // Strip everything except integers
      ageInput.value = ageInput.value.replace(/[^0-9]/g, '');
      if (ageInput.value.length > 3) {
        ageInput.value = ageInput.value.slice(0, 3);
      }
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      // Strip letters, allow digits, spaces, plus, and hyphens
      phoneInput.value = phoneInput.value.replace(/[^0-9\s+-]/g, '');
    });
  }
}

/**
 * 5. Real-Time Form Validation
 */
function initRealtimeValidation() {
  const validateInputs = document.querySelectorAll('.validation-wrapper input, .validation-wrapper textarea, .validation-wrapper select');

  validateInputs.forEach(input => {
    // Validate on input/blur events
    const validate = () => {
      const wrapper = input.closest('.validation-wrapper');
      if (!wrapper) return;

      let isValid = false;

      // Type-specific field validations
      if (input.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(input.value.trim());
      } else if (input.id === 'phone') {
        isValid = input.value.trim().length >= 8;
      } else if (input.id === 'age') {
        const age = parseInt(input.value, 10);
        isValid = !isNaN(age) && age >= 1 && age <= 120;
      } else if (input.id === 'fullName') {
        isValid = input.value.trim().length >= 2;
      } else if (input.tagName === 'SELECT') {
        isValid = input.value !== '';
      } else {
        // Default text inputs or emergency contact
        isValid = input.value.trim().length > 0;
      }

      if (input.value.trim() === '') {
        wrapper.classList.remove('valid', 'invalid');
      } else if (isValid) {
        wrapper.classList.add('valid');
        wrapper.classList.remove('invalid');
      } else {
        wrapper.classList.add('invalid');
        wrapper.classList.remove('valid');
      }
    };

    input.addEventListener('input', validate);
    input.addEventListener('blur', validate);
  });
}

/**
 * 6. Multi-Step Form Layout Mechanics
 */
function initMultiStepForm() {
  const form = document.getElementById('volunteerRegForm');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.form-step'));
  const nextBtns = form.querySelectorAll('.btn-next-step');
  const prevBtns = form.querySelectorAll('.btn-prev-step');
  const stepNodes = document.querySelectorAll('.step-node');
  const progressLine = document.getElementById('stepProgressLine');
  const submitBtn = form.querySelector('.btn-submit');
  const spinner = submitBtn ? submitBtn.querySelector('.spinner') : null;

  let currentStep = 0;

  // Next step click
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        currentStep++;
        updateStepView();
      }
    });
  });

  // Prev step click
  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentStep--;
      updateStepView();
    });
  });

  // Display Spinner on submit
  form.addEventListener('submit', (e) => {
    // Double-check the final validation step
    if (!validateStep(currentStep)) {
      e.preventDefault();
      return;
    }

    if (submitBtn && spinner) {
      spinner.style.display = 'block';
      submitBtn.style.opacity = '0.85';
      submitBtn.style.pointerEvents = 'none';
    }
  });

  function validateStep(stepIndex) {
    const stepEl = steps[stepIndex];
    const inputs = Array.from(stepEl.querySelectorAll('input[required], select[required], textarea[required]'));
    let stepValid = true;

    // Validate inputs
    inputs.forEach(input => {
      // Trigger native change to fire validations
      const wrapper = input.closest('.validation-wrapper');
      if (input.value.trim() === '') {
        stepValid = false;
        if (wrapper) wrapper.classList.add('invalid');
      } else if (wrapper && wrapper.classList.contains('invalid')) {
        stepValid = false;
      }
    });

    // Validation specifically for skills checkbox list (in step 2)
    if (stepIndex === 0 && stepEl.querySelector('.skills-tags-container')) {
      // Skill checklist is actually in step 2, but let's check skill checked count on step 2 validation
    }
    
    if (stepIndex === 1) {
      const skillsChecked = form.querySelectorAll('input[name="skills"]:checked');
      const skillsLabel = document.getElementById('skillsLabel');
      if (skillsChecked.length === 0) {
        stepValid = false;
        if (skillsLabel) {
          skillsLabel.style.color = 'var(--color-danger)';
        }
      } else {
        if (skillsLabel) {
          skillsLabel.style.color = 'var(--text-muted)';
        }
      }
    }

    if (!stepValid) {
      // Scroll to the first error input
      const firstError = stepEl.querySelector('.validation-wrapper.invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return stepValid;
  }

  function updateStepView() {
    // Hide/show steps
    steps.forEach((step, idx) => {
      if (idx === currentStep) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update progress steps
    stepNodes.forEach((node, idx) => {
      if (idx < currentStep) {
        node.classList.add('completed');
        node.classList.remove('active');
      } else if (idx === currentStep) {
        node.classList.add('active');
        node.classList.remove('completed');
      } else {
        node.classList.remove('active', 'completed');
      }
    });

    // Update progress line width
    if (progressLine) {
      const percentage = (currentStep / (steps.length - 1)) * 100;
      progressLine.style.width = `${percentage}%`;
    }
  }
}

/**
 * 7. Confetti Animations for Registration Success Page
 */
function initConfetti() {
  const container = document.getElementById('confettiContainer');
  if (!container) return;

  const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  const particleCount = 100;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    
    // Random sizes, shapes, colors, speeds
    const width = Math.random() * 8 + 4;
    const height = Math.random() * 8 + 4;
    particle.style.width = `${width}px`;
    particle.style.height = `${height}px`;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Horizontal start and animation durations
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `-20px`;
    
    // Custom falling animation keyframe
    const duration = Math.random() * 3 + 2; // 2s - 5s
    const delay = Math.random() * 2; // 0s - 2s
    
    particle.style.animation = `fall-${i} ${duration}s linear ${delay}s infinite`;
    
    // Add unique keyframe rule to the document stylesheet
    const spinSpeed = Math.random() * 360 + 360;
    const drift = Math.random() * 100 - 50; // drift left or right
    
    const keyframes = `
      @keyframes fall-${i} {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(105vh) translateX(${drift}px) rotate(${spinSpeed}deg);
          opacity: 0;
        }
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = keyframes;
    document.head.appendChild(styleSheet);
    container.appendChild(particle);
  }
}

/**
 * 8. Pure Client-side JS CSV Exporter (No Library)
 */
function initCsvExport() {
  const exportBtn = document.getElementById('btnExportCsv');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    // Get json raw data embedded in the page
    const rawDataStr = document.getElementById('volunteersRawData').textContent;
    if (!rawDataStr) return;

    try {
      const data = JSON.parse(rawDataStr);
      if (data.length === 0) {
        alert('No data available to export.');
        return;
      }

      // Convert JSON structure to CSV text
      const csvHeaders = ['Full Name', 'Email', 'Phone', 'Age', 'Gender', 'City', 'Skills', 'Availability', 'Experience Level', 'Motivation', 'Emergency Contact', 'Status', 'Registered At'];
      
      const csvRows = [
        csvHeaders.join(',') // Add headers row
      ];

      data.forEach(item => {
        const row = [
          escapeCsvField(item.fullName),
          escapeCsvField(item.email),
          escapeCsvField(item.phone),
          escapeCsvField(item.age),
          escapeCsvField(item.gender),
          escapeCsvField(item.city),
          escapeCsvField(item.skills.join('; ')), // multi-select separated by semicolons
          escapeCsvField(item.availability),
          escapeCsvField(item.experienceLevel),
          escapeCsvField(item.motivation),
          escapeCsvField(item.emergencyContact),
          escapeCsvField(item.status),
          escapeCsvField(new Date(item.createdAt).toLocaleString())
        ];
        csvRows.push(row.join(','));
      });

      // Create a Blob from the CSV data
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const encodedUri = URL.createObjectURL(blob);
      
      // Create a virtual download anchor link
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `volunteers_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link); // Required for FF
      
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(encodedUri);
    } catch (e) {
      console.error('CSV Export failed', e);
      alert('An error occurred exporting CSV data.');
    }
  });

  // Helper function to handle commas, newlines, and quotes in fields
  function escapeCsvField(value) {
    if (value === null || value === undefined) return '';
    let valStr = String(value);
    
    // Replace double quotes with escaped double quotes
    if (valStr.includes(',') || valStr.includes('\n') || valStr.includes('"')) {
      valStr = valStr.replace(/"/g, '""');
      return `"${valStr}"`;
    }
    return valStr;
  }
}
