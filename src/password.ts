import {scrypt, randomBytes, timingSafeEqual} from 'crypto';
import {promisify} from 'util';

const scryptAsync = promisify(scrypt);

export class Password{
    static async toHash(password: string): Promise<string>{
        const salt = randomBytes(16).toString('hex');

        const buf = (await scryptAsync(password, salt, 64)) as Buffer;

        return `${buf.toString('hex')}.${salt}`;
    }

    static async compare(storedPassword: string, suppliedPassword: string): Promise<boolean>{
        const [hashedPassword, salt] = storedPassword.split('.');

        if(!hashedPassword || !salt){
            return false;
        }

        const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;

        const storedHashBUffer = Buffer.from(hashedPassword, 'hex');

        return timingSafeEqual(buf, storedHashBUffer);
    }
}