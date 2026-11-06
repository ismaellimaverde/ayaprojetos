import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

for (const context of ["production", "deploy-preview", "branch-deploy"]) {
  test(`route imports need no credentials and ${context} without a backend fails closed`, () => {
    const result = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        `
      import assert from 'node:assert/strict';
      const {getPool} = await import('./src/lib/db.ts');
      const {getAuth} = await import('./src/lib/auth.ts');
      const authRoute = await import('./src/app/api/auth/[...all]/route.ts');
      const bossRoute = await import('./src/app/api/boss/[...path]/route.ts');
      assert.equal(globalThis.bossPool, undefined);
      assert.throws(()=>getPool(), /Serviço indisponível/);
      assert.throws(()=>getAuth(), /Serviço indisponível/);
      const session = await authRoute.GET(new Request('https://preview.example.test/api/auth/get-session'));
      assert.equal(session.status,503);
      assert.equal(session.headers.get('cache-control'),'no-store');
      assert.deepEqual(await session.json(),{message:'Serviço indisponível neste ambiente.'});
      const signup = await authRoute.POST(new Request('https://preview.example.test/api/auth/sign-up/email',{method:'POST'}));
      assert.equal(signup.status,403);
      const me = await bossRoute.GET(new Request('https://preview.example.test/api/boss/me'),{params:Promise.resolve({path:['me']})});
      assert.equal(me.status,503);
      assert.equal(globalThis.bossPool,undefined);
      console.log('closed');
    `,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NETLIFY: "true",
          CONTEXT: context,
          DATABASE_URL:
            context === "production"
              ? ""
              : "postgresql://boss_app:synthetic@production.invalid:6543/postgres",
          BETTER_AUTH_URL:
            context === "production" ? "" : "https://production.example.test",
          BETTER_AUTH_SECRET:
            context === "production"
              ? ""
              : "synthetic-preview-test-only-00000000000000",
          DATABASE_SSL_CA: "",
          DATABASE_SSL_CA_SHA256: "",
        },
        encoding: "utf8",
        timeout: 30000,
      },
    );
    assert.equal(result.trim(), "closed");
  });
}
