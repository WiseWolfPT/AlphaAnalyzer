#!/bin/bash

# 🔄 Alfalyzer Backup & Restore Script
# Production-ready backup and restore operations for databases and critical data

set -euo pipefail

# 🎨 Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 📊 Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
DATA_DIR="${PROJECT_ROOT}/data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 🏷️ Default configuration
DEFAULT_ENVIRONMENT="production"
DEFAULT_OPERATION="help"
RETENTION_DAYS=30
MAX_BACKUPS=50

# 📝 Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 📋 Help function
show_help() {
    cat << EOF
🔄 Alfalyzer Backup & Restore Script

USAGE:
    $0 [OPERATION] [OPTIONS]

OPERATIONS:
    backup              Create a full backup
    restore             Restore from backup
    list                List available backups
    cleanup             Clean old backups
    verify              Verify backup integrity
    help                Show this help

OPTIONS:
    -e, --environment   Environment (production, staging, development) [default: production]
    -f, --file          Backup file for restore operation
    -d, --directory     Custom backup directory
    -k, --keep          Number of backups to keep [default: $MAX_BACKUPS]
    -r, --retention     Retention days [default: $RETENTION_DAYS]
    --supabase          Include Supabase database backup
    --sqlite            Include SQLite database backup
    --uploads           Include uploaded files
    --config            Include configuration files
    --all               Include all data types
    --dry-run           Show what would be done without executing

EXAMPLES:
    $0 backup --all                     # Full backup of all data
    $0 backup --sqlite --uploads        # Backup database and uploads
    $0 restore -f backup_20240706.tar.gz
    $0 list                            # Show available backups
    $0 cleanup --retention 7           # Keep only 7 days of backups

ENVIRONMENT VARIABLES:
    SUPABASE_PROJECT_ID     Supabase project ID
    SUPABASE_SERVICE_KEY    Supabase service role key
    BACKUP_ENCRYPTION_KEY   Key for backup encryption (optional)
    SLACK_WEBHOOK_URL       Slack webhook for notifications (optional)

EOF
}

# 🔧 Parse command line arguments
parse_args() {
    OPERATION="$DEFAULT_OPERATION"
    ENVIRONMENT="$DEFAULT_ENVIRONMENT"
    BACKUP_FILE=""
    CUSTOM_BACKUP_DIR=""
    KEEP_BACKUPS="$MAX_BACKUPS"
    RETENTION="$RETENTION_DAYS"
    
    # Data type flags
    INCLUDE_SUPABASE=false
    INCLUDE_SQLITE=false
    INCLUDE_UPLOADS=false
    INCLUDE_CONFIG=false
    INCLUDE_ALL=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            backup|restore|list|cleanup|verify|help)
                OPERATION="$1"
                shift
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -f|--file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -d|--directory)
                CUSTOM_BACKUP_DIR="$2"
                shift 2
                ;;
            -k|--keep)
                KEEP_BACKUPS="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION="$2"
                shift 2
                ;;
            --supabase)
                INCLUDE_SUPABASE=true
                shift
                ;;
            --sqlite)
                INCLUDE_SQLITE=true
                shift
                ;;
            --uploads)
                INCLUDE_UPLOADS=true
                shift
                ;;
            --config)
                INCLUDE_CONFIG=true
                shift
                ;;
            --all)
                INCLUDE_ALL=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set custom backup directory if provided
    if [[ -n "$CUSTOM_BACKUP_DIR" ]]; then
        BACKUP_DIR="$CUSTOM_BACKUP_DIR"
    fi
    
    # If --all is specified, enable all data types
    if [[ "$INCLUDE_ALL" == "true" ]]; then
        INCLUDE_SUPABASE=true
        INCLUDE_SQLITE=true
        INCLUDE_UPLOADS=true
        INCLUDE_CONFIG=true
    fi
    
    # If no specific data types selected, default to SQLite and uploads
    if [[ "$INCLUDE_SUPABASE" == "false" && "$INCLUDE_SQLITE" == "false" && "$INCLUDE_UPLOADS" == "false" && "$INCLUDE_CONFIG" == "false" ]]; then
        INCLUDE_SQLITE=true
        INCLUDE_UPLOADS=true
    fi
}

# 📁 Setup backup directory
setup_backup_dir() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would create backup directory: $BACKUP_DIR"
        return
    fi
    
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"  # Secure permissions
    
    success "Backup directory ready: $BACKUP_DIR"
}

# 🗄️ Backup SQLite database
backup_sqlite() {
    local db_file="${DATA_DIR}/alfalyzer.db"
    local backup_file="${BACKUP_DIR}/sqlite_${TIMESTAMP}.db"
    
    if [[ ! -f "$db_file" ]]; then
        warning "SQLite database not found: $db_file"
        return
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would backup SQLite database: $db_file -> $backup_file"
        return
    fi
    
    log "Backing up SQLite database..."
    
    # Use SQLite's backup command for safe backup
    sqlite3 "$db_file" ".backup '$backup_file'"
    
    # Verify backup
    if sqlite3 "$backup_file" "PRAGMA integrity_check;" | grep -q "ok"; then
        success "SQLite backup completed: $backup_file"
        return "$backup_file"
    else
        error "SQLite backup verification failed"
        rm -f "$backup_file"
        return 1
    fi
}

# 🏗️ Backup Supabase database
backup_supabase() {
    local backup_file="${BACKUP_DIR}/supabase_${TIMESTAMP}.sql"
    
    if [[ -z "${SUPABASE_PROJECT_ID:-}" ]] || [[ -z "${SUPABASE_SERVICE_KEY:-}" ]]; then
        warning "Supabase credentials not configured, skipping Supabase backup"
        return
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would backup Supabase database to: $backup_file"
        return
    fi
    
    log "Backing up Supabase database..."
    
    # Use pg_dump via Supabase connection
    local db_url="postgresql://postgres:${SUPABASE_SERVICE_KEY}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"
    
    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump "$db_url" > "$backup_file"
        success "Supabase backup completed: $backup_file"
        return "$backup_file"
    else
        warning "pg_dump not found, skipping Supabase backup"
        return
    fi
}

# 📁 Backup uploads and files
backup_uploads() {
    local uploads_dir="${PROJECT_ROOT}/uploads"
    local backup_file="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
    
    if [[ ! -d "$uploads_dir" ]]; then
        log "No uploads directory found, creating placeholder"
        mkdir -p "$uploads_dir"
        echo "# Uploads directory created $(date)" > "$uploads_dir/README.txt"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would backup uploads: $uploads_dir -> $backup_file"
        return
    fi
    
    log "Backing up uploads and files..."
    
    tar -czf "$backup_file" -C "$PROJECT_ROOT" uploads/ 2>/dev/null || true
    
    if [[ -f "$backup_file" ]]; then
        success "Uploads backup completed: $backup_file"
        return "$backup_file"
    else
        warning "Uploads backup failed or no files to backup"
        return
    fi
}

# ⚙️ Backup configuration files
backup_config() {
    local backup_file="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"
    local temp_dir=$(mktemp -d)
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would backup configuration files to: $backup_file"
        return
    fi
    
    log "Backing up configuration files..."
    
    # Copy configuration files to temp directory
    mkdir -p "$temp_dir/config"
    
    # Copy important config files (excluding secrets)
    [[ -f "${PROJECT_ROOT}/package.json" ]] && cp "${PROJECT_ROOT}/package.json" "$temp_dir/config/"
    [[ -f "${PROJECT_ROOT}/vercel.json" ]] && cp "${PROJECT_ROOT}/vercel.json" "$temp_dir/config/"
    [[ -f "${PROJECT_ROOT}/tailwind.config.ts" ]] && cp "${PROJECT_ROOT}/tailwind.config.ts" "$temp_dir/config/"
    [[ -f "${PROJECT_ROOT}/vite.config.ts" ]] && cp "${PROJECT_ROOT}/vite.config.ts" "$temp_dir/config/"
    [[ -f "${PROJECT_ROOT}/tsconfig.json" ]] && cp "${PROJECT_ROOT}/tsconfig.json" "$temp_dir/config/"
    [[ -d "${PROJECT_ROOT}/migrations" ]] && cp -r "${PROJECT_ROOT}/migrations" "$temp_dir/config/"
    
    # Create backup
    tar -czf "$backup_file" -C "$temp_dir" config/
    
    # Cleanup
    rm -rf "$temp_dir"
    
    if [[ -f "$backup_file" ]]; then
        success "Configuration backup completed: $backup_file"
        return "$backup_file"
    else
        warning "Configuration backup failed"
        return
    fi
}

# 🎁 Create combined backup
create_backup() {
    log "Starting backup for environment: $ENVIRONMENT"
    
    setup_backup_dir
    
    local backup_files=()
    local backup_manifest="${BACKUP_DIR}/backup_${TIMESTAMP}.manifest"
    
    # Create manifest file
    cat > "$backup_manifest" << EOF
# Alfalyzer Backup Manifest
# Created: $(date)
# Environment: $ENVIRONMENT
# Hostname: $(hostname)
# User: $(whoami)

BACKUP_TIMESTAMP=$TIMESTAMP
BACKUP_ENVIRONMENT=$ENVIRONMENT
BACKUP_VERSION=1.0
EOF
    
    # Perform individual backups
    if [[ "$INCLUDE_SQLITE" == "true" ]]; then
        if backup_sqlite; then
            backup_files+=("sqlite_${TIMESTAMP}.db")
            echo "SQLITE_BACKUP=sqlite_${TIMESTAMP}.db" >> "$backup_manifest"
        fi
    fi
    
    if [[ "$INCLUDE_SUPABASE" == "true" ]]; then
        if backup_supabase; then
            backup_files+=("supabase_${TIMESTAMP}.sql")
            echo "SUPABASE_BACKUP=supabase_${TIMESTAMP}.sql" >> "$backup_manifest"
        fi
    fi
    
    if [[ "$INCLUDE_UPLOADS" == "true" ]]; then
        if backup_uploads; then
            backup_files+=("uploads_${TIMESTAMP}.tar.gz")
            echo "UPLOADS_BACKUP=uploads_${TIMESTAMP}.tar.gz" >> "$backup_manifest"
        fi
    fi
    
    if [[ "$INCLUDE_CONFIG" == "true" ]]; then
        if backup_config; then
            backup_files+=("config_${TIMESTAMP}.tar.gz")
            echo "CONFIG_BACKUP=config_${TIMESTAMP}.tar.gz" >> "$backup_manifest"
        fi
    fi
    
    # Create combined backup archive
    local combined_backup="${BACKUP_DIR}/alfalyzer_backup_${TIMESTAMP}.tar.gz"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would create combined backup: $combined_backup"
        log "DRY RUN: Files to include: ${backup_files[*]}"
        return
    fi
    
    if [[ ${#backup_files[@]} -gt 0 ]]; then
        cd "$BACKUP_DIR"
        tar -czf "alfalyzer_backup_${TIMESTAMP}.tar.gz" "backup_${TIMESTAMP}.manifest" "${backup_files[@]}"
        cd - > /dev/null
        
        # Cleanup individual files
        rm -f "$backup_manifest" "${backup_files[@]/#/${BACKUP_DIR}/}"
        
        success "Combined backup created: $combined_backup"
        
        # Send notification
        send_notification "✅ Backup completed successfully" "Environment: $ENVIRONMENT\nBackup: alfalyzer_backup_${TIMESTAMP}.tar.gz\nSize: $(du -h "$combined_backup" | cut -f1)"
    else
        error "No backup files created"
        exit 1
    fi
}

# 🔄 Restore from backup
restore_backup() {
    if [[ -z "$BACKUP_FILE" ]]; then
        error "Backup file not specified. Use -f option."
        exit 1
    fi
    
    local backup_path
    if [[ "$BACKUP_FILE" == /* ]]; then
        backup_path="$BACKUP_FILE"
    else
        backup_path="${BACKUP_DIR}/$BACKUP_FILE"
    fi
    
    if [[ ! -f "$backup_path" ]]; then
        error "Backup file not found: $backup_path"
        exit 1
    fi
    
    log "Restoring from backup: $backup_path"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "DRY RUN: Would restore from: $backup_path"
        return
    fi
    
    # Create temporary extraction directory
    local temp_dir=$(mktemp -d)
    
    # Extract backup
    tar -xzf "$backup_path" -C "$temp_dir"
    
    # Read manifest
    local manifest_file="$temp_dir/backup_*.manifest"
    if [[ -f $manifest_file ]]; then
        source "$manifest_file"
        log "Restoring backup from $BACKUP_TIMESTAMP (Environment: $BACKUP_ENVIRONMENT)"
    else
        warning "Backup manifest not found, proceeding with basic restore"
    fi
    
    # Restore individual components
    for backup_file in "$temp_dir"/*; do
        local filename=$(basename "$backup_file")
        
        case "$filename" in
            sqlite_*.db)
                log "Restoring SQLite database..."
                cp "$backup_file" "${DATA_DIR}/alfalyzer.db.restored"
                success "SQLite database restored to: ${DATA_DIR}/alfalyzer.db.restored"
                warning "Remember to replace the active database file manually"
                ;;
            supabase_*.sql)
                log "Supabase restore file prepared: $backup_file"
                warning "Supabase restore must be done manually using: psql -f $backup_file"
                ;;
            uploads_*.tar.gz)
                log "Restoring uploads..."
                tar -xzf "$backup_file" -C "$PROJECT_ROOT"
                success "Uploads restored"
                ;;
            config_*.tar.gz)
                log "Restoring configuration..."
                tar -xzf "$backup_file" -C "$PROJECT_ROOT"
                success "Configuration restored"
                ;;
        esac
    done
    
    # Cleanup
    rm -rf "$temp_dir"
    
    success "Restore completed from: $backup_path"
    send_notification "🔄 Restore completed" "Environment: $ENVIRONMENT\nRestored from: $BACKUP_FILE"
}

# 📋 List available backups
list_backups() {
    log "Available backups in: $BACKUP_DIR"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warning "Backup directory not found: $BACKUP_DIR"
        return
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "alfalyzer_backup_*.tar.gz" -type f | sort -r))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        warning "No backups found"
        return
    fi
    
    echo
    printf "%-30s %-15s %-10s\n" "BACKUP FILE" "DATE" "SIZE"
    printf "%-30s %-15s %-10s\n" "----------" "----" "----"
    
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local date_str=$(echo "$filename" | grep -o '[0-9]\{8\}_[0-9]\{6\}' | sed 's/_/ /')
        local size=$(du -h "$backup" | cut -f1)
        
        printf "%-30s %-15s %-10s\n" "$filename" "$date_str" "$size"
    done
    
    echo
    success "Found ${#backups[@]} backup(s)"
}

# 🧹 Cleanup old backups
cleanup_backups() {
    log "Cleaning up backups older than $RETENTION days..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warning "Backup directory not found: $BACKUP_DIR"
        return
    fi
    
    local deleted_count=0
    
    # Remove backups older than retention period
    if [[ "$DRY_RUN" == "true" ]]; then
        local old_backups=($(find "$BACKUP_DIR" -name "alfalyzer_backup_*.tar.gz" -type f -mtime +$RETENTION))
        log "DRY RUN: Would delete ${#old_backups[@]} old backup(s)"
        for backup in "${old_backups[@]}"; do
            log "DRY RUN: Would delete: $(basename "$backup")"
        done
    else
        while IFS= read -r -d '' backup; do
            log "Deleting old backup: $(basename "$backup")"
            rm -f "$backup"
            ((deleted_count++))
        done < <(find "$BACKUP_DIR" -name "alfalyzer_backup_*.tar.gz" -type f -mtime +$RETENTION -print0)
    fi
    
    # Limit number of backups
    local all_backups=($(find "$BACKUP_DIR" -name "alfalyzer_backup_*.tar.gz" -type f | sort -r))
    
    if [[ ${#all_backups[@]} -gt $KEEP_BACKUPS ]]; then
        local excess=$((${#all_backups[@]} - $KEEP_BACKUPS))
        log "Keeping only $KEEP_BACKUPS most recent backups (removing $excess)"
        
        for ((i=$KEEP_BACKUPS; i<${#all_backups[@]}; i++)); do
            if [[ "$DRY_RUN" == "true" ]]; then
                log "DRY RUN: Would delete excess backup: $(basename "${all_backups[$i]}")"
            else
                log "Deleting excess backup: $(basename "${all_backups[$i]}")"
                rm -f "${all_backups[$i]}"
                ((deleted_count++))
            fi
        done
    fi
    
    if [[ "$DRY_RUN" == "false" ]]; then
        success "Cleanup completed. Deleted $deleted_count backup(s)"
    fi
}

# ✅ Verify backup integrity
verify_backup() {
    if [[ -z "$BACKUP_FILE" ]]; then
        error "Backup file not specified. Use -f option."
        exit 1
    fi
    
    local backup_path
    if [[ "$BACKUP_FILE" == /* ]]; then
        backup_path="$BACKUP_FILE"
    else
        backup_path="${BACKUP_DIR}/$BACKUP_FILE"
    fi
    
    if [[ ! -f "$backup_path" ]]; then
        error "Backup file not found: $backup_path"
        exit 1
    fi
    
    log "Verifying backup integrity: $backup_path"
    
    # Test archive integrity
    if tar -tzf "$backup_path" >/dev/null 2>&1; then
        success "Backup archive is valid"
    else
        error "Backup archive is corrupted"
        exit 1
    fi
    
    # Extract and verify contents
    local temp_dir=$(mktemp -d)
    tar -xzf "$backup_path" -C "$temp_dir"
    
    # Verify manifest
    local manifest_file="$temp_dir"/backup_*.manifest
    if [[ -f $manifest_file ]]; then
        source "$manifest_file"
        success "Backup manifest found: $BACKUP_TIMESTAMP"
    else
        warning "Backup manifest missing"
    fi
    
    # Verify individual components
    for backup_file in "$temp_dir"/*; do
        local filename=$(basename "$backup_file")
        
        case "$filename" in
            sqlite_*.db)
                if sqlite3 "$backup_file" "PRAGMA integrity_check;" | grep -q "ok"; then
                    success "SQLite backup verified"
                else
                    error "SQLite backup is corrupted"
                fi
                ;;
            *.tar.gz)
                if tar -tzf "$backup_file" >/dev/null 2>&1; then
                    success "Archive $filename verified"
                else
                    error "Archive $filename is corrupted"
                fi
                ;;
        esac
    done
    
    # Cleanup
    rm -rf "$temp_dir"
    
    success "Backup verification completed"
}

# 📢 Send notification
send_notification() {
    local title="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$title\",\"attachments\":[{\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# 🚀 Main execution
main() {
    log "🔄 Alfalyzer Backup & Restore Script"
    log "Timestamp: $TIMESTAMP"
    
    parse_args "$@"
    
    case "$OPERATION" in
        backup)
            create_backup
            ;;
        restore)
            restore_backup
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_backups
            ;;
        verify)
            verify_backup
            ;;
        help)
            show_help
            ;;
        *)
            error "Unknown operation: $OPERATION"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"