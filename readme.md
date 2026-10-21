# Rise Criation

Portfólio audiovisual estático com HTML, CSS e JavaScript puro. Não exige instalação de dependências nem compilação e pode ser hospedado no GitHub Pages.

## Executar

Abra `index.html` no navegador ou sirva a pasta por HTTP. Com Python instalado: `python -m http.server 8000` e acesse http://localhost:8000.

## Estrutura e manutenção

- `index.html`: conteúdo, metadados, menu, cinco filmes e contato comercial.
- `css/style.css`: direção de arte, layouts responsivos, foco e movimento reduzido.
- `js/script.js`: menu mobile, cabeçalho ao rolar, seção ativa, animações com IntersectionObserver e ano automático.
- `assets/images/hero-cinematic.webp`: capa gerada e otimizada, 1672 × 941 px, aproximadamente 100 KB.
- `scripts/verify.mjs`: verificação em navegador real sem pacotes externos.

Os arquivos originais da marca, imagens dos projetos, PDFs e vídeos MOV foram preservados. Os PDFs e MOV não são carregados pelo site. A logo em uso continua sendo `LOGOTIPO.png`.

### WhatsApp

O telefone existente é `5563991162918`. O link e a mensagem original estão no botão `btn-orcamento`, diretamente no HTML, para funcionar mesmo sem JavaScript. Ao alterar o contato, use apenas dígitos no caminho `https://wa.me/` e codifique a mensagem do parâmetro `text` como URL.

### Portfólio

Os cinco projetos e URLs originais do YouTube foram preservados. Cada card possui um link na capa e outro no texto. Atualize ambos ao mudar o destino de um filme. Preserve o texto alternativo da imagem, a descrição acessível da capa e `rel="noopener noreferrer"` nos links externos.

### Capa cinematográfica

Imagem realmente criada com a ferramenta integrada imagegen e convertida para WebP pelo codificador nativo do Chrome, com qualidade 0,86. O PNG original permanece na pasta de imagens geradas do Codex; o projeto carrega apenas o WebP otimizado.

Prompt utilizado:

> Use case: photorealistic-natural. Asset type: cinematic website hero background for Rise Criation audiovisual production studio. Create a realistic premium editorial photograph of a professional cinema production in progress. Widescreen 16:9 composition, approximately 1920x1080. High-end cinema camera in foreground on the right third, subtle working film crew far behind, sophisticated dark studio, dramatic amber and orange practical lighting, deep black shadows, restrained lens reflections, cinematic depth of field, realistic textures. Left half must be dark quiet negative space to place a large white heading. No text, logos, watermarks or UI. Understated professional film studio atmosphere, no excessive glow.

A capa possui preload, enquadramento responsivo e overlays para legibilidade. Se não carregar, os gradientes e a cor de fundo mantêm a seção legível.

## Verificação automatizada

Requer Node.js 22 ou superior, com WebSocket global, e Chrome ou Edge instalado no Windows:

```powershell
node --check js/script.js
node scripts/verify.mjs
```

Para outro caminho de instalação, configure a variável `CHROME_PATH` com o executável do navegador. O teste usa um servidor local temporário, um perfil isolado e Chrome DevTools Protocol, encerra o navegador e o servidor ao terminar e informa a pasta temporária de capturas.

O roteiro verifica 375, 768 e 1440 px; rolagem horizontal; imagens carregadas; IDs únicos; âncoras; cinco cards; contato; ano; atalho de teclado; abertura e fechamento do menu, Escape e devolução do foco; compensação do cabeçalho; movimento reduzido; funcionamento sem JavaScript; erros de console e respostas HTTP locais. Capturas são feitas para todas as seções nas três larguras.

## Antes de publicar e próxima versão

- Validar os textos e a direção visual com a equipe e conferir manualmente a reprodução dos vídeos e o atendimento no WhatsApp. Os testes não enviam mensagens nem verificam a disponibilidade do YouTube.
- Com o domínio definitivo, adicionar canonical, `og:url` e uma imagem social com URL absoluta. Os metadados Open Graph de título, descrição, idioma e tipo já estão configurados.
- Fazer uma rodada em dispositivos reais, Safari e leitor de tela; o teste automatizado atual usa Chrome.
- Em uma próxima versão, criar miniaturas WebP responsivas com `srcset` mantendo os JPG originais e avaliar um showreel real aprovado pela produtora.

Nenhum deploy, commit ou push é executado pelos scripts do projeto. Não foram atribuídas pontuações Lighthouse.
