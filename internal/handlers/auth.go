package handlers

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"wiki-go/internal/auth"
	"wiki-go/internal/config"
	"wiki-go/internal/crypto"
	"wiki-go/internal/resources"
	"wiki-go/internal/i18n"
	"wiki-go/internal/roles"
)

type LoginRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	KeepLoggedIn bool   `json:"keepLoggedIn"`
}

// LoginHandler handles API login requests
func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate credentials
	valid, role := auth.ValidateCredentials(req.Username, req.Password, cfg)
	if !valid {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Create session
	if err := auth.CreateSession(w, req.Username, role, req.KeepLoggedIn, cfg); err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// CheckAuthHandler checks if the user is authenticated
func CheckAuthHandler(w http.ResponseWriter, r *http.Request) {
	session := auth.GetSession(r)
	if session == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Return user information including role
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"username": session.Username,
		"role":     session.Role,
	})
}

// LogoutHandler handles user logout
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(w, r, cfg)
	w.WriteHeader(http.StatusOK)
}

// LoginPageHandler renders the login page
func LoginPageHandler(w http.ResponseWriter, r *http.Request) {
	// If user is already logged in, redirect to home page
	session := auth.GetSession(r)
	if session != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// Prepare the data for the template
	data := struct {
		Config *config.Config
		Theme  string
	}{
		Config: cfg,
		Theme:  "light", // Default theme
	}

	// Get theme from cookie if available
	if cookie, err := r.Cookie("theme"); err == nil {
		data.Theme = cookie.Value
	}

	// Create function map with translation function
	funcMap := template.FuncMap{
		"t": func(key string) string {
			return i18n.Translate(key)
		},
	}

	// Get and execute login template with translation function
	tmpl, err := template.New("login.html").Funcs(funcMap).ParseFS(resources.GetTemplatesFS(), "templates/login.html")
	if err != nil {
		http.Error(w, "Error loading login template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Set content type header before writing response
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	// Execute template directly to response writer
	err = tmpl.Execute(w, data)
	if err != nil {
		// Since we've already started writing the response, we can't use http.Error here
		// But we can log the error
		log.Printf("Error rendering login template: %v", err)
	}
}

// CheckDefaultPasswordHandler checks if the default admin password is still in use
func CheckDefaultPasswordHandler(w http.ResponseWriter, r *http.Request) {
	// Default admin credentials (typically admin/admin)
	defaultUsername := "admin"
	defaultPassword := "admin"

	// Check if any admin user still has the default password
	defaultPasswordInUse := false

	for _, user := range cfg.Users {
		if user.Role == roles.RoleAdmin && user.Username == defaultUsername {
			// Check if password is still the default
			if crypto.CheckPasswordHash(defaultPassword, user.Password) {
				defaultPasswordInUse = true
				break
			}
		}
	}

	// Return the result
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{
		"defaultPasswordInUse": defaultPasswordInUse,
	})
}
