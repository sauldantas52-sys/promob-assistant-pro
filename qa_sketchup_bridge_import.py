import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Auth Injection
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        await page.goto("http://localhost:8080")
        if storage_key and session_json:
            await page.evaluate(f"window.localStorage.setItem('{storage_key}', '{session_json}')")
        
        # 1. Navegar diretamente para a página de um projeto conhecido (usando o ID da URL do contexto)
        project_id = "5e1598ce-5020-41f1-8d67-19d1bd2c2bf4"
        await page.goto(f"http://localhost:8080/projects/{project_id}")
        await page.wait_for_load_state("networkidle")
        print(f"Acessou detalhe do projeto {project_id}")

        # 2. Ir para aba Ponte SKP
        await page.get_by_role("tab", name="Ponte SKP").click()
        print("Aba Ponte SKP ativa")

        # 3. Upload do Manifesto
        manifest_path = Path("public/manifest_valid_example.json").absolute()
        async with page.expect_file_chooser() as fc:
            # Selecionando o botão pelo texto exato conforme o componente
            await page.get_by_role("button", name="Nova Versão").click()
        
        file_chooser = await fc.value
        await file_chooser.set_files(str(manifest_path))
        print("Upload do manifesto realizado")

        # 4. Validar Toast e UI
        try:
            await page.wait_for_selector("text=Versão importada com sucesso!", timeout=15000)
            print("Toast de sucesso confirmado")
        except Exception as e:
            print(f"Erro ao validar sucesso: {e}")
            await page.screenshot(path="/tmp/browser/skp_bridge_error.png")
            raise e

        # 5. Screenshot final
        await page.screenshot(path="/tmp/browser/skp_bridge_success.png")
        print("Screenshot salva em /tmp/browser/skp_bridge_success.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
