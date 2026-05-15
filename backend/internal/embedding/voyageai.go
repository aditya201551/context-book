package embedding

import (
	"context"
	"fmt"

	"github.com/austinfhunter/voyageai"
)

type VoyageClient struct {
	client *voyageai.VoyageClient
	model  string
}

func NewVoyageClient(apiKey, model string) *VoyageClient {
	client := voyageai.NewClient(&voyageai.VoyageClientOpts{
		Key: apiKey,
	})

	return &VoyageClient{
		client: client,
		model:  model,
	}
}

// CreateEmbedding generates an embedding for a single text chunk and returns the embedding vector + token count.
func (c *VoyageClient) CreateEmbedding(ctx context.Context, text, inputType string) ([]float32, int, error) {
	opts := &voyageai.EmbeddingRequestOpts{}
	if inputType != "" {
		opts.InputType = &inputType
	}

	resp, err := c.client.Embed([]string{text}, c.model, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create embedding: %w", err)
	}

	if len(resp.Data) == 0 {
		return nil, 0, fmt.Errorf("no embedding data returned")
	}

	return resp.Data[0].Embedding, resp.Usage.TotalTokens, nil
}

// CreateEmbeddingsBatch generates embeddings for multiple chunks in one request.
// Note: the Voyage API returns total_tokens for the whole batch, not per-text.
// Token counts are not returned here; use CreateEmbedding for per-text token counts.
func (c *VoyageClient) CreateEmbeddingsBatch(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	opts := &voyageai.EmbeddingRequestOpts{}
	if inputType != "" {
		opts.InputType = &inputType
	}

	resp, err := c.client.Embed(texts, c.model, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create embeddings batch: %w", err)
	}

	embeddings := make([][]float32, len(resp.Data))
	for i, data := range resp.Data {
		embeddings[i] = data.Embedding
	}

	return embeddings, nil
}
