package db

import (
	"context"
	"fmt"
	"time"
)

// UserCluster is a named group of tags created by a user.
type UserCluster struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	Tags      []string  `json:"tags"`
	Color     string    `json:"color"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

func (db *DB) ListUserClusters(ctx context.Context, userID string) ([]UserCluster, error) {
	query := `
		SELECT id, user_id, name, tags, color, sort_order, created_at
		FROM user_clusters
		WHERE user_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`
	rows, err := db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clusters []UserCluster
	for rows.Next() {
		var c UserCluster
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.Name, &c.Tags, &c.Color, &c.SortOrder, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		clusters = append(clusters, c)
	}
	return clusters, nil
}

func (db *DB) CreateUserCluster(ctx context.Context, userID, name string, tags []string, color string) (*UserCluster, error) {
	query := `
		INSERT INTO user_clusters (user_id, name, tags, color, sort_order)
		VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM user_clusters WHERE user_id = $1))
		RETURNING id, user_id, name, tags, color, sort_order, created_at
	`
	var c UserCluster
	err := db.Pool.QueryRow(ctx, query, userID, name, tags, color).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Tags, &c.Color, &c.SortOrder, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) UpdateUserCluster(ctx context.Context, id, userID, name string, tags []string, color string) error {
	query := `
		UPDATE user_clusters
		SET name = $1, tags = $2, color = $3
		WHERE id = $4 AND user_id = $5
	`
	res, err := db.Pool.Exec(ctx, query, name, tags, color, id, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("cluster not found")
	}
	return nil
}

func (db *DB) DeleteUserCluster(ctx context.Context, id, userID string) error {
	query := `DELETE FROM user_clusters WHERE id = $1 AND user_id = $2`
	res, err := db.Pool.Exec(ctx, query, id, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("cluster not found")
	}
	return nil
}
