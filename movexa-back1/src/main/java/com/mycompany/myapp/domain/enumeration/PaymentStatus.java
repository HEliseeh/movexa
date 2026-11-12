package com.mycompany.myapp.domain.enumeration;

/** PENDING : lien envoyé, pas encore payé. CANCELLED : annulé avec motif (jamais supprimé). */
public enum PaymentStatus {
    PENDING,
    PAID,
    CANCELLED,
}
