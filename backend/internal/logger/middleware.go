package logger

import (
	"log/slog"
	"net/http"
	"time"
)

// responseWriter is a custom wrapper that tracks the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Write intercepts the Write call to make sure statusCode is set if WriteHeader wasn't explicitly called
func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	return rw.ResponseWriter.Write(b)
}

// HttpMiddleware logs each HTTP request with its latency and status code.
func HttpMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the writer
		rw := &responseWriter{ResponseWriter: w}

		// Let the request traverse the stack
		next.ServeHTTP(rw, r)

		duration := time.Since(start)

		// Set default status if nothing was explicitly written
		if rw.statusCode == 0 {
			rw.statusCode = http.StatusOK
		}

		slog.Info("http request",
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rw.statusCode),
			slog.String("remote_ip", r.RemoteAddr),
			slog.Duration("latency", duration),
		)
	})
}
