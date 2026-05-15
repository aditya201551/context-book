package logger

import (
	"log/slog"
	"os"
)

// Setup configures the default slog logger globally.
// In true production environments, it uses the JSONHandler.
// In development, it uses TextHandler for readability.
func Setup(env string) {
	var handler slog.Handler

	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}

	if env == "production" || env == "prod" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)
	slog.SetDefault(logger)
}
