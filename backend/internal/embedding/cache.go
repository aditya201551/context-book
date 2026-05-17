package embedding

import (
	"context"
	"sync"

	lru "github.com/hashicorp/golang-lru/v2"
)

type embedder interface {
	CreateEmbedding(ctx context.Context, text, inputType string) ([]float32, int, error)
	CreateEmbeddingsBatch(ctx context.Context, texts []string, inputType string) ([][]float32, error)
}

type cacheEntry struct {
	vec   []float32
	count int
}

type CachedEmbedder struct {
	inner embedder
	mu    sync.Mutex
	cache *lru.Cache[string, cacheEntry]
}

func NewCachedEmbedder(inner embedder, size int) *CachedEmbedder {
	if size <= 0 {
		size = 256
	}
	c, _ := lru.New[string, cacheEntry](size)
	return &CachedEmbedder{
		inner: inner,
		cache: c,
	}
}

func (c *CachedEmbedder) CreateEmbedding(ctx context.Context, text, inputType string) ([]float32, int, error) {
	key := inputType + "\x00" + text
	c.mu.Lock()
	if v, ok := c.cache.Get(key); ok {
		vec := v.vec
		c.mu.Unlock()
		return vec, v.count, nil
	}
	c.mu.Unlock()

	vec, count, err := c.inner.CreateEmbedding(ctx, text, inputType)
	if err != nil {
		return nil, 0, err
	}

	c.mu.Lock()
	c.cache.Add(key, cacheEntry{vec: vec, count: count})
	c.mu.Unlock()

	return vec, count, nil
}

func (c *CachedEmbedder) CreateEmbeddingsBatch(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	return c.inner.CreateEmbeddingsBatch(ctx, texts, inputType)
}
