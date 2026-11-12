package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.domain.enumeration.PaymentStatus;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/**
 * Un encaissement. Jamais supprimé : une erreur se corrige par une annulation avec motif.
 * Un paiement par lien reste PENDING jusqu'à la confirmation de l'agrégateur.
 */
@Getter
@Setter
@Entity
@Table(name = "payment")
public class Payment implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    private Plan plan;

    /** Abonnement créé par ce paiement (null tant qu'un lien n'est pas payé). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    @Column(name = "plan_name", length = 100)
    private String planName;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 20, nullable = false)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private PaymentStatus status;

    @Column(name = "receipt_number", length = 20, unique = true)
    private String receiptNumber;

    /** Référence libre saisie à l'accueil (ex. id de transaction MoMo). */
    @Column(name = "reference", length = 100)
    private String reference;

    @Column(name = "link_token", length = 40, unique = true)
    private String linkToken;

    @Column(name = "transaction_id", length = 100, unique = true)
    private String transactionId;

    /** Date de début demandée à l'inscription ; sinon on applique la règle de renouvellement. */
    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancelled_by", length = 100)
    private String cancelledBy;

    @Column(name = "cancel_reason", length = 300)
    private String cancelReason;
}
