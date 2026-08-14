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
        
        # 1. Navegar para Projetos
        await page.goto("http://localhost:8080/projects")
        await page.wait_for_load_state("networkidle")
        print("Acessou dashboard de projetos")

        # 2. Pegar o primeiro projeto
        project_card = page.locator("a[href^='/projects/']").first
        await project_card.click()
        await page.wait_for_load_state("networkidle")
        print("Acessou detalhe do projeto:", page.url)

        # 3. Ir para aba Ponte SKP
        await page.get_by_role("tab", name="Ponte SKP").click()
        print("Aba Ponte SKP ativa")

        # 4. Upload do Manifesto
        manifest_path = Path("public/manifest_valid_example.json").absolute()
        async with page.expect_file_chooser() as fc:
            await page.get_by_role("button", name="Nova Versão").click()
        
        file_chooser = await fc.value
        await file_chooser.set_files(str(manifest_path))
        print("Upload do manifesto realizado")

        # 5. Validar Toast e UI
        await page.wait_for_selector("text=Versão importada com sucesso!", timeout=10000)
        print("Toast de sucesso confirmado")

        # 6. Screenshot final
        await page.screenshot(path="/tmp/browser/skp_bridge_success.png")
        print("Screenshot salva em /tmp/browser/skp_bridge_success.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
