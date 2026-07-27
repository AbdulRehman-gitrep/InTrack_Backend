import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface CredentialEntry {
  fullName: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
}

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);
  private readonly filePath = path.resolve(process.cwd(), 'credentials.json');

  save(email: string, password: string, fullName: string, role: string) {
    try {
      const entry: CredentialEntry = {
        fullName,
        email,
        password,
        role,
        createdAt: new Date().toISOString(),
      };

      let entries: CredentialEntry[] = [];
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        entries = JSON.parse(raw) as CredentialEntry[];
      }

      entries.push(entry);
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(entries, null, 2),
        'utf-8',
      );

      this.logger.log(`Credentials saved for ${email}`);
    } catch (err) {
      this.logger.error(`Failed to save credentials for ${email}`, err);
    }
  }
}
