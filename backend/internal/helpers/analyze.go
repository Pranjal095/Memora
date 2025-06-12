package helpers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
)

type Result struct {
	Probability float64 `json:"probability"`
	Label       string  `json:"label"`
}

var audioExts = map[string]struct{}{
	".mp3": {}, ".wav": {}, ".m4a": {}, ".flac": {}, ".ogg": {}, ".aac": {},
}

func AnalyzeURL(ctx context.Context, urlStr string) (Result, error) {
	tmp, err := os.MkdirTemp("", "echocast")
	if err != nil {
		return Result{}, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmp)

	input := filepath.Join(tmp, "input")
	u, err := url.Parse(urlStr)
	if err != nil {
		return Result{}, fmt.Errorf("invalid URL: %w", err)
	}
	ext := strings.ToLower(path.Ext(u.Path))

	if _, ok := audioExts[ext]; ok {
		resp, err := http.Get(urlStr)
		if err != nil {
			return Result{}, fmt.Errorf("fetch URL: %w", err)
		}
		defer resp.Body.Close()
		f, err := os.Create(input + ext)
		if err != nil {
			return Result{}, fmt.Errorf("create file: %w", err)
		}
		io.Copy(f, resp.Body)
		f.Close()
		input += ext
	} else {
		cmd := exec.CommandContext(ctx,
			"yt-dlp",
			"-x", "--audio-format", "wav",
			urlStr,
			"-o", input+".%(ext)s",
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			return Result{}, fmt.Errorf("download failed: %s", out)
		}
		input += ".wav"
	}

	wav := filepath.Join(tmp, "audio.wav")
	cmd := exec.CommandContext(ctx,
		"ffmpeg", "-y",
		"-i", input,
		"-ar", "16000", "-ac", "1",
		wav,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return Result{}, fmt.Errorf("conversion failed: %s", out)
	}

	py := filepath.Join("microservice", "main.py")
	outBytes, err := exec.CommandContext(ctx, "python3", py, wav).CombinedOutput()
	if err != nil {
		fmt.Printf("%s\n", outBytes)
		return Result{}, fmt.Errorf("inference failed: %s", outBytes)
	}
	var res Result
	if err := json.Unmarshal(outBytes, &res); err != nil {
		return Result{}, fmt.Errorf("invalid inference output: %w", err)
	}
	return res, nil
}
