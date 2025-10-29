#!/usr/bin/env node

/**
 * Database backup script for production
 * Creates automated backups with retention policy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log } = require('../src/lib/structured-logger');

// Configuration
const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  BACKUP_DIR: process.env.BACKUP_DIR || './backups',
  RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  COMPRESSION: process.env.BACKUP_COMPRESSION !== 'false',
  S3_BUCKET: process.env.BACKUP_S3_BUCKET,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1'
};

class DatabaseBackup {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupName = `cvcircle-backup-${this.timestamp}`;
    this.backupPath = path.join(CONFIG.BACKUP_DIR, this.backupName);
  }

  async validateEnvironment() {
    if (!CONFIG.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
      fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
      log.info('Created backup directory', { backupDir: CONFIG.BACKUP_DIR });
    }
  }

  async createBackup() {
    log.info('Starting database backup', { 
      backupName: this.backupName,
      compression: CONFIG.COMPRESSION 
    });

    const startTime = Date.now();
    
    try {
      // Create mongodump command
      let command = `mongodump --uri="${CONFIG.MONGODB_URI}" --out="${this.backupPath}"`;
      
      // Add compression if enabled
      if (CONFIG.COMPRESSION) {
        command += ' --gzip';
      }

      // Execute backup
      execSync(command, { stdio: 'inherit' });
      
      const duration = Date.now() - startTime;
      log.info('Database backup completed successfully', {
        backupName: this.backupName,
        duration: duration,
        backupPath: this.backupPath
      });

      return this.backupPath;
    } catch (error) {
      log.error('Database backup failed', error, {
        backupName: this.backupName,
        command: command
      });
      throw error;
    }
  }

  async compressBackup() {
    if (!CONFIG.COMPRESSION) {
      return this.backupPath;
    }

    log.info('Compressing backup', { backupPath: this.backupPath });
    
    const startTime = Date.now();
    const compressedPath = `${this.backupPath}.tar.gz`;
    
    try {
      execSync(`tar -czf "${compressedPath}" -C "${CONFIG.BACKUP_DIR}" "${this.backupName}"`, { stdio: 'inherit' });
      
      // Remove uncompressed directory
      execSync(`rm -rf "${this.backupPath}"`, { stdio: 'inherit' });
      
      const duration = Date.now() - startTime;
      const stats = fs.statSync(compressedPath);
      
      log.info('Backup compressed successfully', {
        compressedPath: compressedPath,
        size: stats.size,
        duration: duration
      });

      return compressedPath;
    } catch (error) {
      log.error('Backup compression failed', error, {
        backupPath: this.backupPath,
        compressedPath: compressedPath
      });
      throw error;
    }
  }

  async uploadToS3(backupPath) {
    if (!CONFIG.S3_BUCKET) {
      log.info('S3 upload skipped - no bucket configured');
      return;
    }

    log.info('Uploading backup to S3', { 
      bucket: CONFIG.S3_BUCKET,
      key: `backups/${path.basename(backupPath)}`
    });

    const startTime = Date.now();
    
    try {
      const s3Key = `backups/${path.basename(backupPath)}`;
      const command = `aws s3 cp "${backupPath}" "s3://${CONFIG.S3_BUCKET}/${s3Key}" --region ${CONFIG.AWS_REGION}`;
      
      execSync(command, { stdio: 'inherit' });
      
      const duration = Date.now() - startTime;
      log.info('Backup uploaded to S3 successfully', {
        bucket: CONFIG.S3_BUCKET,
        key: s3Key,
        duration: duration
      });
    } catch (error) {
      log.error('S3 upload failed', error, {
        bucket: CONFIG.S3_BUCKET,
        backupPath: backupPath
      });
      throw error;
    }
  }

  async cleanupOldBackups() {
    log.info('Cleaning up old backups', { retentionDays: CONFIG.RETENTION_DAYS });
    
    try {
      const files = fs.readdirSync(CONFIG.BACKUP_DIR);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.RETENTION_DAYS);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(CONFIG.BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          log.debug('Deleted old backup', { file: file, mtime: stats.mtime });
        }
      }
      
      log.info('Cleanup completed', { deletedCount: deletedCount });
    } catch (error) {
      log.error('Cleanup failed', error);
      throw error;
    }
  }

  async createBackupMetadata(backupPath) {
    const metadata = {
      timestamp: this.timestamp,
      backupName: this.backupName,
      backupPath: backupPath,
      mongodbUri: CONFIG.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Hide credentials
      compression: CONFIG.COMPRESSION,
      retentionDays: CONFIG.RETENTION_DAYS,
      s3Bucket: CONFIG.S3_BUCKET,
      size: fs.statSync(backupPath).size,
      created: new Date().toISOString()
    };

    const metadataPath = `${backupPath}.metadata.json`;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    log.info('Backup metadata created', { metadataPath: metadataPath });
    return metadataPath;
  }

  async run() {
    try {
      await this.validateEnvironment();
      
      const backupPath = await this.createBackup();
      const compressedPath = await this.compressBackup();
      await this.uploadToS3(compressedPath);
      await this.createBackupMetadata(compressedPath);
      await this.cleanupOldBackups();
      
      log.info('Database backup process completed successfully', {
        backupName: this.backupName,
        finalPath: compressedPath
      });
      
    } catch (error) {
      log.error('Database backup process failed', error);
      process.exit(1);
    }
  }
}

// Run backup if this script is executed directly
if (require.main === module) {
  const backup = new DatabaseBackup();
  backup.run();
}

module.exports = DatabaseBackup;