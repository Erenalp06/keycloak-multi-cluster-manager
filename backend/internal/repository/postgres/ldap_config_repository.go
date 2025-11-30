package postgres

import (
	"database/sql"
	"encoding/json"
	"keycloak-multi-manage/internal/domain"
	"time"
)

func nullStringToString(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}

type LDAPConfigRepository struct {
	db *sql.DB
}

func NewLDAPConfigRepository(db *sql.DB) *LDAPConfigRepository {
	return &LDAPConfigRepository{db: db}
}

func (r *LDAPConfigRepository) Get() (*domain.LDAPConfig, error) {
	query := `
		SELECT id, enabled, server_url, bind_dn, bind_password, user_search_base, 
		       user_search_filter, group_search_base, group_search_filter, 
		       use_ssl, use_tls, skip_verify, timeout_seconds, 
		       certificate_pem, certificate_info, certificate_fingerprint,
		       created_at, updated_at
		FROM ldap_config
		ORDER BY id DESC
		LIMIT 1
	`

	config := &domain.LDAPConfig{}
	var groupSearchBase, groupSearchFilter sql.NullString
	var userSearchFilter sql.NullString
	var certPEM, certFingerprint sql.NullString
	var certInfoJSON sql.NullString
	
	err := r.db.QueryRow(query).Scan(
		&config.ID,
		&config.Enabled,
		&config.ServerURL,
		&config.BindDN,
		&config.BindPassword,
		&config.UserSearchBase,
		&userSearchFilter,
		&groupSearchBase,
		&groupSearchFilter,
		&config.UseSSL,
		&config.UseTLS,
		&config.SkipVerify,
		&config.TimeoutSeconds,
		&certPEM,
		&certInfoJSON,
		&certFingerprint,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		// Return default disabled config
		return &domain.LDAPConfig{
			Enabled:          false,
			UserSearchFilter: "(uid={0})",
			UseTLS:           true,
			TimeoutSeconds:   10,
		}, nil
	}
	if err != nil {
		return nil, err
	}

	// Convert NULL strings to empty strings
	config.UserSearchFilter = nullStringToString(userSearchFilter)
	if config.UserSearchFilter == "" {
		config.UserSearchFilter = "(uid={0})"
	}
	config.GroupSearchBase = nullStringToString(groupSearchBase)
	config.GroupSearchFilter = nullStringToString(groupSearchFilter)
	
	// Parse certificate fields
	config.CertificatePEM = nullStringToString(certPEM)
	config.CertificateFingerprint = nullStringToString(certFingerprint)
	
	if certInfoJSON.Valid && certInfoJSON.String != "" {
		var certInfo domain.CertificateInfo
		if err := json.Unmarshal([]byte(certInfoJSON.String), &certInfo); err == nil {
			config.CertificateInfo = &certInfo
		}
	}

	return config, nil
}

func (r *LDAPConfigRepository) Update(req *domain.UpdateLDAPConfigRequest) (*domain.LDAPConfig, error) {
	// Check if config exists
	existing, err := r.Get()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var config *domain.LDAPConfig

	if existing.ID == 0 {
		// Insert new config
		query := `
			INSERT INTO ldap_config (enabled, server_url, bind_dn, bind_password, user_search_base,
			                         user_search_filter, group_search_base, group_search_filter,
			                         use_ssl, use_tls, skip_verify, timeout_seconds, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			RETURNING id
		`

		userSearchFilter := req.UserSearchFilter
		if userSearchFilter == "" {
			userSearchFilter = "(uid={0})"
		}

		timeoutSeconds := req.TimeoutSeconds
		if timeoutSeconds == 0 {
			timeoutSeconds = 10
		}

		var id int
		err := r.db.QueryRow(
			query,
			req.Enabled,
			req.ServerURL,
			req.BindDN,
			req.BindPassword,
			req.UserSearchBase,
			userSearchFilter,
			req.GroupSearchBase,
			req.GroupSearchFilter,
			req.UseSSL,
			req.UseTLS,
			req.SkipVerify,
			timeoutSeconds,
			now,
			now,
		).Scan(&id)

		if err != nil {
			return nil, err
		}

		config = &domain.LDAPConfig{
			ID:               id,
			Enabled:          req.Enabled,
			ServerURL:        req.ServerURL,
			BindDN:           req.BindDN,
			BindPassword:     req.BindPassword,
			UserSearchBase:   req.UserSearchBase,
			UserSearchFilter: userSearchFilter,
			GroupSearchBase:   req.GroupSearchBase,
			GroupSearchFilter: req.GroupSearchFilter,
			UseSSL:           req.UseSSL,
			UseTLS:           req.UseTLS,
			SkipVerify:       req.SkipVerify,
			TimeoutSeconds:   timeoutSeconds,
			CreatedAt:        now,
			UpdatedAt:        now,
		}
	} else {
		// Update existing config
		// If password is empty, keep the existing one
		var password string
		if req.BindPassword != "" {
			password = req.BindPassword
		} else {
			password = existing.BindPassword
		}

		userSearchFilter := req.UserSearchFilter
		if userSearchFilter == "" {
			userSearchFilter = existing.UserSearchFilter
		}
		if userSearchFilter == "" {
			userSearchFilter = "(uid={0})"
		}

		timeoutSeconds := req.TimeoutSeconds
		if timeoutSeconds == 0 {
			timeoutSeconds = existing.TimeoutSeconds
		}
		if timeoutSeconds == 0 {
			timeoutSeconds = 10
		}

		query := `
			UPDATE ldap_config 
			SET enabled = $1, server_url = $2, bind_dn = $3, bind_password = $4,
			    user_search_base = $5, user_search_filter = $6, group_search_base = $7,
			    group_search_filter = $8, use_ssl = $9, use_tls = $10, skip_verify = $11,
			    timeout_seconds = $12, updated_at = $13
			WHERE id = $14
		`

		_, err := r.db.Exec(
			query,
			req.Enabled,
			req.ServerURL,
			req.BindDN,
			password,
			req.UserSearchBase,
			userSearchFilter,
			req.GroupSearchBase,
			req.GroupSearchFilter,
			req.UseSSL,
			req.UseTLS,
			req.SkipVerify,
			timeoutSeconds,
			now,
			existing.ID,
		)

		if err != nil {
			return nil, err
		}

		config = &domain.LDAPConfig{
			ID:               existing.ID,
			Enabled:          req.Enabled,
			ServerURL:        req.ServerURL,
			BindDN:           req.BindDN,
			BindPassword:     password,
			UserSearchBase:   req.UserSearchBase,
			UserSearchFilter: userSearchFilter,
			GroupSearchBase:   req.GroupSearchBase,
			GroupSearchFilter: req.GroupSearchFilter,
			UseSSL:           req.UseSSL,
			UseTLS:           req.UseTLS,
			SkipVerify:       req.SkipVerify,
			TimeoutSeconds:   timeoutSeconds,
			CreatedAt:        existing.CreatedAt,
			UpdatedAt:        now,
		}
	}

	// Clear password from response
	config.BindPassword = ""
	return config, nil
}

// UpdateCertificate updates the certificate information for LDAP config
func (r *LDAPConfigRepository) UpdateCertificate(certPEM string, certInfo *domain.CertificateInfo, fingerprint string) error {
	// Get existing config
	existing, err := r.Get()
	if err != nil {
		return err
	}
	
	if existing.ID == 0 {
		return sql.ErrNoRows
	}
	
	// Serialize certificate info to JSON
	var certInfoJSON sql.NullString
	if certInfo != nil {
		jsonData, err := json.Marshal(certInfo)
		if err == nil {
			certInfoJSON = sql.NullString{String: string(jsonData), Valid: true}
		}
	}
	
	query := `
		UPDATE ldap_config 
		SET certificate_pem = $1, certificate_info = $2, certificate_fingerprint = $3, updated_at = $4
		WHERE id = $5
	`
	
	_, err = r.db.Exec(
		query,
		certPEM,
		certInfoJSON,
		fingerprint,
		time.Now(),
		existing.ID,
	)
	
	return err
}

// DeleteCertificate removes the certificate from LDAP config
func (r *LDAPConfigRepository) DeleteCertificate() error {
	existing, err := r.Get()
	if err != nil {
		return err
	}
	
	if existing.ID == 0 {
		return sql.ErrNoRows
	}
	
	query := `
		UPDATE ldap_config 
		SET certificate_pem = NULL, certificate_info = NULL, certificate_fingerprint = NULL, updated_at = $1
		WHERE id = $2
	`
	
	_, err = r.db.Exec(query, time.Now(), existing.ID)
	return err
}

