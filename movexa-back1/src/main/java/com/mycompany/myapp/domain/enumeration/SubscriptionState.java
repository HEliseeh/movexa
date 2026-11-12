package com.mycompany.myapp.domain.enumeration;

/** État d'un membre vis-à-vis de son abonnement, calculé à partir de la date de fin (jamais stocké). */
public enum SubscriptionState {
    ACTIVE,
    EXPIRING_SOON,
    EXPIRED,
    NONE,
}
