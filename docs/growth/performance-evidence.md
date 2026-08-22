# Ed. Gamboas — evidência local de performance e experiência

Medições feitas nos arquivos do repositório em 19 de agosto de 2026. Elas demonstram a redução de transferência potencial; LCP, CLS e INP reais ainda precisam ser medidos na URL publicada depois do deploy.

## Imagens antes e depois

| Conjunto | Antes | Depois | Redução |
| --- | ---: | ---: | ---: |
| 9 imagens da landing, originais JPEG versus candidatos WebP de 640 px | 2.260.022 B | 339.820 B | 85,0% |
| 9 imagens da landing, originais JPEG versus candidatos WebP de 960 px | 2.260.022 B | 687.262 B | 69,6% |
| 9 imagens da landing, originais JPEG versus WebP na maior resolução disponível | 2.260.022 B | 1.143.936 B | 49,4% |
| Hero, JPEG versus WebP de 640 px | 252.100 B | 32.846 B | 87,0% |
| Hero, JPEG versus WebP de 960 px | 252.100 B | 73.942 B | 70,7% |
| Rooftop da confirmação, PNG versus WebP de 640 px | 2.353.415 B | 31.152 B | 98,7% |

Cada `<picture>` conserva o JPEG/PNG original como fallback. `srcset` e `sizes` permitem ao navegador escolher 640 px, 960 px ou a maior versão conforme largura e densidade. O hero mantém `fetchpriority="high"`; imagens abaixo da dobra usam `loading="lazy"`.

## QA responsivo local

| Cenário | Resultado observado |
| --- | --- |
| Landing em 390 × 844 | Sem overflow horizontal; Ed. Gamboas, recém-entregue, pronto para morar, Zona Norte, R$ 295 mil, entrada e CTA visíveis na primeira dobra |
| CTA fixo mobile | Oculto enquanto o CTA do hero está visível; aparece depois da navegação ao formulário |
| Formulário mobile | Etapas 1/2 e 2/2 funcionam; telefone repetido é rejeitado com mensagem e `aria-invalid` |
| Landing em 1440 × 900 | Hero e formulário lado a lado, CTA de continuidade visível e sem overflow horizontal |
| Confirmação em 390 × 844 | Mensagem e WhatsApp aparecem antes da imagem, sem overflow; navegador escolheu `rooftop-640.webp` |
| Privacidade em 390 × 844 | Sem overflow; link de gerenciamento reabre o banner e oculta o CTA fixo |
| Mapa incorporado | O iframe não possui `src` no carregamento inicial e só recebe a URL após a ação explícita `Carregar mapa interativo` |
| Console do navegador | Nenhum erro ou aviso no fluxo local validado |

No teste desktop, o navegador escolheu `gamboas-sala-mobiliada-960.webp`. No teste mobile da confirmação, escolheu `rooftop-640.webp`.

## O que ainda precisa de produção

- LCP, CLS e INP em dados de campo e Lighthouse na URL publicada;
- impacto de Pixel e GA4 com consentimento aceito e rede real do navegador interno do Instagram;
- cabeçalhos de cache e compressão entregues pelo GitHub Pages;
- taxa real de conversão e abandono por etapa depois de volume suficiente.
