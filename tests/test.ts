import { Password } from "../src/password";

async function test(){
    console.log('--- Starting Auth Test ---');

    const myPassword = 'super_secret_password';

    // 1. Test Hashing
    console.log('1. Hashing password');
    const storedHash = await Password.toHash(myPassword);
    console.log(`   Result: ${storedHash}`);

    // 2. Test Correct Password
    console.log('2. Verifying correct password');
    const isMatch = await Password.compare(storedHash, 'super_secret_password');
    console.log(`   Is Match? ${isMatch}`);

    // 3. Test Wrong Password
    console.log('3. Verifying wrong password');
    const isMatchWrong = await Password.compare(storedHash, 'wrong_password');
    console.log(`   Is Match? ${isMatchWrong}`);

    console.log('--- Done ---');
}

test();
