// Signup form handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    
    // Validate email format (YorkU)
    if (!email.toLowerCase().endsWith('@my.yorku.ca')) {
        errorMessage.textContent = 'Email must be a valid YorkU email address (@my.yorku.ca)';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Password validation function
    function validatePassword(password) {
        if (password.length < 8) {
            return { isValid: false, error: 'Password must be at least 8 characters long' };
        }
        if (!/[A-Z]/.test(password)) {
            return { isValid: false, error: 'Password must include at least one uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { isValid: false, error: 'Password must include at least one lowercase letter' };
        }
        if (!/\d/.test(password)) {
            return { isValid: false, error: 'Password must include at least one number' };
        }
        if (!/[!@#$%^&*]/.test(password)) {
            return { isValid: false, error: 'Password must include at least one special character (!@#$%^&*)' };
        }
        return { isValid: true };
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        errorMessage.textContent = passwordValidation.error;
        errorMessage.style.display = 'block';
        return;
    }
    
    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Success - redirect to dashboard
            window.location.href = '/dashboard';
        } else {
            // Show error message
            errorMessage.textContent = data.error || 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    } catch (error) {
        errorMessage.textContent = 'Network error. Please check your connection and try again.';
        errorMessage.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Real-time email validation
document.getElementById('email').addEventListener('blur', function() {
    const email = this.value.trim().toLowerCase();
    const errorMessage = document.getElementById('errorMessage');
    
    if (email && !email.endsWith('@my.yorku.ca')) {
        errorMessage.textContent = 'Email must be a valid YorkU email address (@my.yorku.ca)';
        errorMessage.style.display = 'block';
    } else {
        errorMessage.style.display = 'none';
    }
});

// Password validation function
function validatePassword(password) {
    if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, error: 'Password must include at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, error: 'Password must include at least one lowercase letter' };
    }
    if (!/\d/.test(password)) {
        return { isValid: false, error: 'Password must include at least one number' };
    }
    if (!/[!@#$%^&*]/.test(password)) {
        return { isValid: false, error: 'Password must include at least one special character (!@#$%^&*)' };
    }
    return { isValid: true };
}

// Real-time password validation feedback
document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    const errorMessage = document.getElementById('errorMessage');
    const validation = validatePassword(password);
    
    if (password.length > 0 && !validation.isValid) {
        errorMessage.textContent = validation.error;
        errorMessage.style.display = 'block';
    } else if (password.length > 0 && validation.isValid) {
        errorMessage.style.display = 'none';
    }
});

// Real-time password confirmation validation
document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const errorMessage = document.getElementById('errorMessage');
    
    if (confirmPassword && password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
    } else if (confirmPassword && password === confirmPassword) {
        // Check if password is valid before clearing error
        const validation = validatePassword(password);
        if (validation.isValid) {
            errorMessage.style.display = 'none';
        }
    }
});

