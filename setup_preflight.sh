#!/bin/bash
set -e

echo "🚀 Starting Pre-Flight Setup..."

# Function to check command existence
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# 1. Check Docker
if command_exists docker; then
    echo "✅ Docker is installed."
    if ! docker info >/dev/null 2>&1; then
        echo "⚠️  Docker is installed but not running or permission denied. Please start Docker or check permissions."
        exit 1
    fi
else
    echo "❌ Docker is missing. Please install Docker first."
    exit 1
fi

# 2. Check Act
if command_exists act; then
    echo "✅ act is already installed."
else
    echo "⚠️  act is missing. Attempting installation..."
    
    if command_exists brew; then
        echo "🍺 Installing act via Homebrew..."
        brew install act
    else
        echo "📥 Installing act via curl to ~/.local/bin..."
        mkdir -p ~/.local/bin
        curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash -s -- -b ~/.local/bin
        
        # Check if ~/.local/bin is in PATH
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            echo "⚠️  ~/.local/bin is not in your PATH."
            echo "Please add the following to your shell config (.bashrc/.zshrc):"
            echo 'export PATH=$HOME/.local/bin:$PATH'
        fi
    fi
    
    # Verify installation
    if command_exists act || [ -f ~/.local/bin/act ]; then
        echo "✅ act installed successfully."
    else
        echo "❌ Failed to install act. Please install it manually: https://github.com/nektos/act"
        exit 1
    fi
fi

# 3. Check Runtimes
echo "🔍 Checking runtimes..."
if command_exists node; then echo "✅ Node.js $(node -v)"; else echo "❌ Node.js missing"; fi
if command_exists python3; then echo "✅ Python $(python3 --version)"; else echo "❌ Python missing"; fi

echo "✅ Setup complete! run './check-prepush.sh' to start pre-flight checks."
