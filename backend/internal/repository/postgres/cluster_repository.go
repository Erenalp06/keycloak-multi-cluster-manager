package postgres

import (
	"database/sql"
	"keycloak-multi-manage/internal/domain"
	"time"
)

type ClusterRepository struct {
	db *sql.DB
}

func NewClusterRepository(db *sql.DB) *ClusterRepository {
	return &ClusterRepository{db: db}
}

func (r *ClusterRepository) Create(cluster *domain.Cluster) error {
	query := `
		INSERT INTO clusters (name, base_url, realm, client_id, client_secret, group_name, metrics_endpoint, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`
	
	now := time.Now()
	err := r.db.QueryRow(
		query,
		cluster.Name,
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
		cluster.GroupName,
		cluster.MetricsEndpoint,
		now,
		now,
	).Scan(&cluster.ID)
	
	if err != nil {
		return err
	}
	
	cluster.CreatedAt = now
	cluster.UpdatedAt = now
	return nil
}

func (r *ClusterRepository) GetAll() ([]*domain.Cluster, error) {
	query := `
		SELECT id, name, base_url, realm, client_id, client_secret, group_name, metrics_endpoint, created_at, updated_at
		FROM clusters
		ORDER BY COALESCE(group_name, ''), name
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var clusters []*domain.Cluster
	for rows.Next() {
		cluster := &domain.Cluster{}
		var clientID sql.NullString
		var clientSecret sql.NullString
		err := rows.Scan(
			&cluster.ID,
			&cluster.Name,
			&cluster.BaseURL,
			&cluster.Realm,
			&clientID,
			&clientSecret,
			&cluster.GroupName,
			&cluster.MetricsEndpoint,
			&cluster.CreatedAt,
			&cluster.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		// Handle NULL values - default to "multi-manage" if client_id is NULL
		if clientID.Valid {
			cluster.ClientID = clientID.String
		} else {
			cluster.ClientID = "multi-manage"
		}
		if clientSecret.Valid {
			cluster.ClientSecret = clientSecret.String
		} else {
			cluster.ClientSecret = ""
		}
		clusters = append(clusters, cluster)
	}
	
	return clusters, rows.Err()
}

func (r *ClusterRepository) GetByID(id int) (*domain.Cluster, error) {
	query := `
		SELECT id, name, base_url, realm, client_id, client_secret, group_name, metrics_endpoint, created_at, updated_at
		FROM clusters
		WHERE id = $1
	`
	
	cluster := &domain.Cluster{}
	var clientID sql.NullString
	var clientSecret sql.NullString
	err := r.db.QueryRow(query, id).Scan(
		&cluster.ID,
		&cluster.Name,
		&cluster.BaseURL,
		&cluster.Realm,
		&clientID,
		&clientSecret,
		&cluster.GroupName,
		&cluster.MetricsEndpoint,
		&cluster.CreatedAt,
		&cluster.UpdatedAt,
	)
	
	// Handle NULL values - default to "multi-manage" if client_id is NULL
	if clientID.Valid {
		cluster.ClientID = clientID.String
	} else {
		cluster.ClientID = "multi-manage"
	}
	if clientSecret.Valid {
		cluster.ClientSecret = clientSecret.String
	} else {
		cluster.ClientSecret = ""
	}
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return cluster, nil
}

func (r *ClusterRepository) Update(cluster *domain.Cluster) error {
	query := `
		UPDATE clusters 
		SET name = $1, base_url = $2, realm = $3, client_id = $4, client_secret = $5, group_name = $6, metrics_endpoint = $7, updated_at = $8
		WHERE id = $9
	`
	
	now := time.Now()
	_, err := r.db.Exec(
		query,
		cluster.Name,
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
		cluster.GroupName,
		cluster.MetricsEndpoint,
		now,
		cluster.ID,
	)
	
	if err != nil {
		return err
	}
	
	cluster.UpdatedAt = now
	return nil
}

func (r *ClusterRepository) Delete(id int) error {
	query := `DELETE FROM clusters WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

