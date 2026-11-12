package com.mycompany.myapp.web.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycompany.myapp.config.ApplicationProperties;
import com.mycompany.myapp.service.PaymentService;
import com.mycompany.myapp.service.dto.PaymentDtos.WebhookPayload;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

/**
 * Notification de l'agrégateur de paiement (KKiaPay / FedaPay) quand un membre a payé par lien.
 * Route publique (pas de JWT) : on vérifie donc une signature HMAC-SHA256 du corps de la requête,
 * calculée avec une clé secrète partagée. Sans clé configurée, tout est refusé.
 *
 * Le format exact (nom de l'en-tête, champs du JSON) est générique ici : il faudra l'adapter à la
 * documentation de l'agrégateur choisi, une fois le compte marchand ouvert.
 */
@RestController
@RequestMapping("/api/public/payments")
public class PaymentWebhookResource {

    private static final Logger LOG = LoggerFactory.getLogger(PaymentWebhookResource.class);
    public static final String SIGNATURE_HEADER = "X-Movexa-Signature";

    private final PaymentService paymentService;
    private final ApplicationProperties properties;
    private final ObjectMapper objectMapper;

    public PaymentWebhookResource(PaymentService paymentService, ApplicationProperties properties, ObjectMapper objectMapper) {
        this.paymentService = paymentService;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String body, @RequestHeader(value = SIGNATURE_HEADER, required = false) String signature)
        throws Exception {
        String secret = properties.getPayment().getWebhookSecret();
        if (!StringUtils.hasText(secret)) {
            LOG.warn("Webhook reçu mais aucune clé n'est configurée (application.payment.webhook-secret)");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        if (signature == null || !MessageDigest.isEqual(sign(body, secret).getBytes(StandardCharsets.UTF_8), signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8))) {
            LOG.warn("Webhook refusé : signature invalide");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        paymentService.handleWebhook(objectMapper.readValue(body, WebhookPayload.class));
        return ResponseEntity.ok().build();
    }

    /** Signature attendue : HMAC-SHA256 du corps brut, en hexadécimal minuscule. */
    static String sign(String body, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}
