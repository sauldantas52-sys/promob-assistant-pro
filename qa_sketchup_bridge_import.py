import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        # Aumentar o timeout global para lidar com processamento lento
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Auth Restore do arquivo da sessão
        session_file = os.path.expanduser("~/.cache/lovable-auth/session.json")
        with open(session_file) as f:
            minted = json.load(f)
        
        storage_key = minted["storage_key"]
        session_json = json.dumps(minted["session"])
        cookies = minted.get("cookies", [])
        
        if cookies:
            for c in cookies:
                c["url"] = "http://localhost:8080"
            await context.add_cookies(cookies)

        await page.goto("http://localhost:8080")
        await page.evaluate(f"window.localStorage.setItem('{storage_key}', '{session_json}')")
        
        # 1. Navegar diretamente para o projeto
        project_id = "5e1598ce-5020-41f1-8d67-19d1bd2c2bf4"
        await page.goto(f"http://localhost:8080/projects/{project_id}")
        await page.wait_for_load_state("networkidle")
        
        # Verificar se não caiu no redirecionamento de senha obrigatória
        if "/force-password-change" in page.url:
            print("Página de troca de senha detectada, ignorando para o teste...")
            # Em um sistema real, aqui teríamos que preencher a senha.
            # Mas como o usuário é admin, talvez possamos forçar o perfil no BD se necessário.
        
        print(f"URL atual: {page.url}")

        # 2. Localizar aba "Ponte SKP" - Tentando seletores variados
        # O texto no componente é "Ponte SKP" mas o label no loop de abas é "Ponte SKP"
        # O TabTrigger usa icon={ArrowRightLeft} label="Ponte SKP"
        try:
            tab = page.locator("button:has-text('Ponte SKP')").first
            await tab.wait_for(state="visible", timeout=20000)
            await tab.click()
            print("Aba Ponte SKP clicada")
        except Exception as e:
            print(f"Erro ao clicar na aba: {e}")
            await page.screenshot(path="/tmp/browser/tab_error.png")
            # Listar botões para debug
            btns = await page.evaluate("Array.from(document.querySelectorAll('button')).map(b => b.textContent)")
            print(f"Botões encontrados: {btns}")
            return

        # 3. Upload do Manifesto
        manifest_path = Path("public/manifest_valid_example.json").absolute()
        async with page.expect_file_chooser() as fc:
            # Botão "Nova Versão"
            await page.get_by_role("button", name="Nova Versão").click()
        
        file_chooser = await fc.value
        await file_chooser.set_files(str(manifest_path))
        print("Upload do manifesto realizado")

        # 4. Validar Toast e UI
        try:
            await page.wait_for_selector("text=Versão importada com sucesso!", timeout=20000)
            print("Toast de sucesso confirmado")
        except Exception as e:
            print(f"Erro ao validar sucesso: {e}")
            await page.screenshot(path="/tmp/browser/skp_bridge_error.png")
            raise e

        # 5. Screenshot final
        await page.screenshot(path="/tmp/browser/skp_bridge_success.png")
        print("Teste finalizado com sucesso.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
