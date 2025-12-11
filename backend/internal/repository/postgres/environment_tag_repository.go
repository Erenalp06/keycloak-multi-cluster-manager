package postgres

import (
	"database/sql"
	"keycloak-multi-manage/internal/domain"
	"time"
	
	"github.com/lib/pq"
)

type EnvironmentTagRepository struct {
	db *sql.DB
}

func NewEnvironmentTagRepository(db *sql.DB) *EnvironmentTagRepository {
	return &EnvironmentTagRepository{db: db}
}

func (r *EnvironmentTagRepository) GetAll() ([]*domain.EnvironmentTag, error) {
	query := `
		SELECT id, name, color, description, created_at, updated_at
		FROM environment_tags
		ORDER BY name
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var tags []*domain.EnvironmentTag
	for rows.Next() {
		tag := &domain.EnvironmentTag{}
		var description sql.NullString
		err := rows.Scan(
			&tag.ID,
			&tag.Name,
			&tag.Color,
			&description,
			&tag.CreatedAt,
			&tag.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if description.Valid {
			tag.Description = description.String
		}
		tags = append(tags, tag)
	}
	
	return tags, rows.Err()
}

func (r *EnvironmentTagRepository) GetByID(id int) (*domain.EnvironmentTag, error) {
	query := `
		SELECT id, name, color, description, created_at, updated_at
		FROM environment_tags
		WHERE id = $1
	`
	
	tag := &domain.EnvironmentTag{}
	var description sql.NullString
	err := r.db.QueryRow(query, id).Scan(
		&tag.ID,
		&tag.Name,
		&tag.Color,
		&description,
		&tag.CreatedAt,
		&tag.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	if description.Valid {
		tag.Description = description.String
	}
	
	return tag, nil
}

func (r *EnvironmentTagRepository) Create(tag *domain.EnvironmentTag) error {
	query := `
		INSERT INTO environment_tags (name, color, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	
	now := time.Now()
	err := r.db.QueryRow(
		query,
		tag.Name,
		tag.Color,
		tag.Description,
		now,
		now,
	).Scan(&tag.ID)
	
	if err != nil {
		return err
	}
	
	tag.CreatedAt = now
	tag.UpdatedAt = now
	return nil
}

func (r *EnvironmentTagRepository) Update(tag *domain.EnvironmentTag) error {
	query := `
		UPDATE environment_tags 
		SET name = $1, color = $2, description = $3, updated_at = $4
		WHERE id = $5
	`
	
	now := time.Now()
	_, err := r.db.Exec(
		query,
		tag.Name,
		tag.Color,
		tag.Description,
		now,
		tag.ID,
	)
	
	if err != nil {
		return err
	}
	
	tag.UpdatedAt = now
	return nil
}

func (r *EnvironmentTagRepository) Delete(id int) error {
	query := `DELETE FROM environment_tags WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *EnvironmentTagRepository) GetTagsByClusterID(clusterID int) ([]*domain.EnvironmentTag, error) {
	query := `
		SELECT t.id, t.name, t.color, t.description, t.created_at, t.updated_at
		FROM environment_tags t
		INNER JOIN cluster_environment_tags cet ON t.id = cet.tag_id
		WHERE cet.cluster_id = $1
		ORDER BY t.name
	`
	
	rows, err := r.db.Query(query, clusterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var tags []*domain.EnvironmentTag
	for rows.Next() {
		tag := &domain.EnvironmentTag{}
		var description sql.NullString
		err := rows.Scan(
			&tag.ID,
			&tag.Name,
			&tag.Color,
			&description,
			&tag.CreatedAt,
			&tag.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if description.Valid {
			tag.Description = description.String
		}
		tags = append(tags, tag)
	}
	
	return tags, rows.Err()
}

func (r *EnvironmentTagRepository) AssignTagsToClusters(clusterIDs []int, tagIDs []int) error {
	query := `
		INSERT INTO cluster_environment_tags (cluster_id, tag_id, created_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP)
		ON CONFLICT (cluster_id, tag_id) DO NOTHING
	`
	
	for _, clusterID := range clusterIDs {
		for _, tagID := range tagIDs {
			_, err := r.db.Exec(query, clusterID, tagID)
			if err != nil {
				return err
			}
		}
	}
	
	return nil
}

func (r *EnvironmentTagRepository) RemoveTagsFromClusters(clusterIDs []int, tagIDs []int) error {
	// Use IN clause with proper parameter handling
	// Build query with proper placeholders
	query := `
		DELETE FROM cluster_environment_tags
		WHERE cluster_id = ANY($1::int[]) AND tag_id = ANY($2::int[])
	`
	
	// Convert slices to pq.Array for PostgreSQL array support
	_, err := r.db.Exec(query, pq.Array(clusterIDs), pq.Array(tagIDs))
	return err
}

func (r *EnvironmentTagRepository) RemoveAllTagsFromCluster(clusterID int) error {
	query := `DELETE FROM cluster_environment_tags WHERE cluster_id = $1`
	_, err := r.db.Exec(query, clusterID)
	return err
}

